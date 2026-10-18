<template>
  <view
    class="ai-canvas-stage"
    :ai-payload="payload"
    :change:ai-payload="ai.onPayloadChange"
  ></view>
</template>

<script>
import { showToast } from '@/shared/utils/toast'
import { classNameOf, classColorOf } from '../ai/classNames'
import { useEditor } from '../useEditor'

export default {
  name: 'AiCanvasStage',
  props: {
    payload: {
      type: String,
      default: '',
    },
  },
  created() {
    this.editor = useEditor()
  },
  methods: {
    onAiPhase(state) {
      if (!state) return
      this.editor.setAiPhase(state.phase, state.text || '', state.error || '')
    },
    onAiRegions(list) {
      const regions = (list || []).map((item) => ({
        id: item.id,
        name: classNameOf(item.id),
        color: classColorOf(item.id),
        count: item.count,
        ratio: item.ratio,
      }))
      this.editor.setAiRegions(regions)
    },
    onAiRegionPick(id) {
      this.editor.selectRegion(typeof id === 'number' ? id : null)
    },
    onAiExitPreview() {
      this.editor.setPreviewing(false)
    },
    onAiToast(text) {
      showToast(text || 'AI 处理失败')
    },
  },
}
</script>

<script module="ai" lang="renderjs">
const ASSET_BASE = './static/ai/'
const ORT_FILE = ASSET_BASE + 'ort.wasm.min.js'
const WASM_FILE = ASSET_BASE + 'ort-wasm-simd-threaded.wasm'
const MODEL_FILE = ASSET_BASE + 'segmentation.onnx'
// 模型输入是动态尺寸（导出元数据里 H/W 为符号维度）。
// 1024 输入可得到 256×256 的分割概率图，是 128×128 的 4 倍像素；
// 依次回退 1024 → 768 → 512，优先保证画质。
const INFER_SIZE = 1024
const INFER_FALLBACKS = [768, 512]
const MAX_SIDE = 1536
const WORK_MAX = 1024
const MEAN = [0.485, 0.456, 0.406]
const STD = [0.229, 0.224, 0.225]
const RESTORE_KEY = 'original'
const REGION_LIMIT = 12
// 占比过低的区域对画面影响很小，展示出来只会让区域栏显得冗长，
// 也会增加引导滤波的耗时，因此低于 1% 的区域不进入列表。
const MIN_REGION_RATIO = 0.01
const MASK_CACHE_LIMIT = 14
const REFINE_RADIUS = 3
const REFINE_EPS = 0.0025
const PLUS_CHUNK_SIZE = 512 * 1024
const PLUS_CHUNK_TIMEOUT = 15000
const PLUS_RESOLVE_TIMEOUT = 6000
const PLUS_DATAURL_TIMEOUT = 30000

export default {
  data() {
    return {
      owner: null,
      host: null,
      hostFallbackLogged: false,
      canvas: null,
      ctx: null,
      dpr: 1,
      resizeObserver: null,
      rafId: 0,
      currentPayload: {},
      lastImageToken: -1,
      lastRetryToken: -1,
      lastStrength: -1,
      lastStyleKey: '',
      jobId: 0,
      running: false,
      phase: 'idle',

      // 图片
      sourceImage: null,
      sourceImageData: null,
      sourceW: 0,
      sourceH: 0,
      workW: 0,
      workH: 0,
      sourceWork: null,

      // 分割
      inferSize: INFER_SIZE,
      mask: null,
      maskW: 0,
      maskH: 0,
      regionsRaw: [],
      probCache: {},
      maskAlphaCache: {},
      guideLow: null,
      guideMean: null,
      guideVar: null,
      guideWork: null,
      logitW: 0,
      logitH: 0,

      // 模型
      scriptPromise: null,
      assetsPromise: null,
      wasmBytes: null,
      modelBytes: null,
      session: null,
      sessionPromise: null,

      // 合成缓存
      composedCanvas: null,
      composedCtx: null,
      composedDirty: true,
      filterSupported: true,
      filteredCache: {},
      maskCanvasCache: {},
      maskCanvasOrder: [],
      overlayCanvas: null,
      overlayKey: '',
      overlayScratch: null,
      overlayScratchCtx: null,
      layerScratch: null,
      layerScratchCtx: null,
      colorCache: {},

      // 视图
      view: {
        zoom: 1,
        offsetX: 0,
        offsetY: 0,
        fit: 1,
      },

      // 手势
      touchState: {
        active: false,
        startX: 0,
        startY: 0,
        lastX: 0,
        lastY: 0,
        moved: false,
        startTime: 0,
      },
      lastTapTime: 0,
      lastTapX: 0,
      lastTapY: 0,
      singleTapTimer: null,
      hasTouchSeen: false,
    }
  },
  mounted() {
    this.ensureCanvas(0)
  },
  unmounted() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = 0
    }
    if (this.singleTapTimer) {
      clearTimeout(this.singleTapTimer)
      this.singleTapTimer = null
    }
    window.removeEventListener('resize', this.onWindowResize)
    window.removeEventListener('mousemove', this.onMouseMove)
    window.removeEventListener('mouseup', this.onMouseUp)
    if (this.canvas) {
      this.canvas.removeEventListener('touchstart', this.onTouchStart)
      this.canvas.removeEventListener('touchmove', this.onTouchMove)
      this.canvas.removeEventListener('touchend', this.onTouchEnd)
      this.canvas.removeEventListener('touchcancel', this.onTouchEnd)
      this.canvas.removeEventListener('mousedown', this.onMouseDown)
    }
    this.jobId += 1
  },
  methods: {
    // ================= 画布与尺寸 =================
    isDomHost(el) {
      return (
        !!el &&
        typeof el.querySelector === 'function' &&
        typeof el.appendChild === 'function' &&
        typeof el.getBoundingClientRect === 'function'
      )
    },
    resolveHost() {
      if (this.isDomHost(this.$el)) return this.$el
      const found = document.querySelector('.ai-canvas-stage')
      if (this.isDomHost(found)) {
        if (!this.hostFallbackLogged) {
          this.hostFallbackLogged = true
          this.log('renderjs $el 不是 DOM，已回退到选择器宿主')
        }
        return found
      }
      return null
    },
    ensureCanvas(attempt) {
      const host = this.resolveHost()
      if (!host) {
        if (attempt < 30) setTimeout(() => this.ensureCanvas(attempt + 1), 100)
        else this.log('画布宿主不可用，无法初始化 Canvas')
        return
      }
      this.host = host
      let canvas = host.querySelector('canvas.ai-canvas')
      if (!canvas) {
        canvas = document.createElement('canvas')
        canvas.className = 'ai-canvas'
        canvas.style.cssText =
          'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none;outline:none;'
        host.appendChild(canvas)
      }
      this.canvas = canvas
      this.ctx = canvas.getContext('2d')
      this.dpr = window.devicePixelRatio || 1
      this.filterSupported = this.detectFilterSupport()
      this.bindCanvasEvents()
      this.bindResize()
      this.updateCanvasSize(true)
      this.draw()
    },
    detectFilterSupport() {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        ctx.filter = 'grayscale(1)'
        return ctx.filter === 'grayscale(1)'
      } catch (e) {
        return false
      }
    },
    bindCanvasEvents() {
      if (!this.canvas || this.canvas.__aiBound) return
      this.canvas.__aiBound = true
      this.onTouchStart = this.onTouchStart || ((event) => this.handleTouchStart(event))
      this.onTouchMove = this.onTouchMove || ((event) => this.handleTouchMove(event))
      this.onTouchEnd = this.onTouchEnd || ((event) => this.handleTouchEnd(event))
      this.onMouseDown = this.onMouseDown || ((event) => this.handleMouseDown(event))
      this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: false })
      this.canvas.addEventListener('touchmove', this.onTouchMove, { passive: false })
      this.canvas.addEventListener('touchend', this.onTouchEnd)
      this.canvas.addEventListener('touchcancel', this.onTouchEnd)
      this.canvas.addEventListener('mousedown', this.onMouseDown)
    },
    bindResize() {
      if (this.resizeObserver || !this.host) return
      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => this.updateCanvasSize(false))
        this.resizeObserver.observe(this.host)
      } else {
        this.onWindowResize = this.onWindowResize || (() => this.updateCanvasSize(false))
        window.addEventListener('resize', this.onWindowResize)
      }
    },
    updateCanvasSize(force) {
      if (!this.canvas || !this.host) return
      const rect = this.host.getBoundingClientRect()
      if (!rect || rect.width < 2 || rect.height < 2) return
      const width = Math.max(2, Math.round(rect.width * this.dpr))
      const height = Math.max(2, Math.round(rect.height * this.dpr))
      if (!force && this.canvas.width === width && this.canvas.height === height) return
      const changed = this.canvas.width !== width || this.canvas.height !== height
      this.canvas.width = width
      this.canvas.height = height
      this.ctx = this.canvas.getContext('2d')
      if (changed && this.sourceImageData) {
        this.view.zoom = 1
        this.view.offsetX = 0
        this.view.offsetY = 0
        this.computeFit()
      }
      this.draw()
    },
    computeFit() {
      if (!this.canvas || !this.workW || !this.workH) {
        this.view.fit = 1
        return
      }
      this.view.fit = Math.min(this.canvas.width / this.workW, this.canvas.height / this.workH)
    },

    // ================= 逻辑层指令 =================
    onPayloadChange(newValue, oldValue, ownerInstance) {
      this.owner = ownerInstance
      try {
        this.ensureCanvas(0)
      } catch (e) {
        this.log('画布初始化异常: ' + this.errorText(e))
      }
      let payload
      try {
        payload = JSON.parse(newValue)
      } catch (e) {
        this.log('自检参数解析失败: ' + e.message)
        return
      }
      const previous = this.currentPayload || {}
      this.currentPayload = payload
      if (!payload || !payload.imagePath) {
        this.jobId += 1
        this.clearImageState()
        this.notifyPhase('empty', '')
        this.draw()
        return
      }

      const styleKey = JSON.stringify({
        full: payload.fullStyle,
        regions: payload.regionStyles,
      })

      if (payload.imageToken !== this.lastImageToken) {
        this.lastImageToken = payload.imageToken
        this.lastRetryToken = payload.retryToken
        this.lastStrength = payload.strength
        this.lastStyleKey = styleKey
        this.startImageJob(payload)
        return
      }

      if (payload.retryToken !== this.lastRetryToken) {
        this.lastRetryToken = payload.retryToken
        this.restartSegmentation()
        return
      }

      if (payload.strength !== this.lastStrength) {
        this.lastStrength = payload.strength
        this.clearFilterCaches()
        this.composedDirty = true
      }
      if (styleKey !== this.lastStyleKey) {
        this.lastStyleKey = styleKey
        this.composedDirty = true
      }
      if (previous.selectedRegion !== payload.selectedRegion) this.composedDirty = true
      if (previous.showMask !== payload.showMask) this.composedDirty = true
      if (previous.comparing !== payload.comparing) this.composedDirty = true
      if (previous.activeTool !== payload.activeTool) this.composedDirty = true
      if (payload.previewing && !previous.previewing) {
        this.view.zoom = 1
        this.view.offsetX = 0
        this.view.offsetY = 0
      }
      this.requestRender()
    },
    notifyPhase(phase, text, error) {
      this.phase = phase
      if (!this.owner) return
      try {
        this.owner.callMethod('onAiPhase', {
          phase: phase,
          text: text || '',
          error: error || '',
        })
      } catch (e) {}
    },
    notifyRegions(list) {
      if (!this.owner) return
      try {
        this.owner.callMethod('onAiRegions', list)
      } catch (e) {}
    },
    notifyPick(id) {
      if (!this.owner) return
      try {
        this.owner.callMethod('onAiRegionPick', id)
      } catch (e) {}
    },
    notifyExitPreview() {
      if (!this.owner) return
      try {
        this.owner.callMethod('onAiExitPreview')
      } catch (e) {}
    },
    notifyError(message) {
      if (!this.owner) return
      try {
        this.owner.callMethod('onAiToast', message)
      } catch (e) {}
    },
    log(message) {
      console.log('[ai-render] ' + message)
    },

    // ================= 图片任务 =================
    async startImageJob(payload) {
      const job = ++this.jobId
      this.running = true
      this.clearImageState()
      this.notifyPhase('loading', '读取图片…')
      this.log('开始处理图片: ' + payload.imageName + ' / ' + payload.imagePath)
      try {
        const imageResult = await this.loadImageSafe(payload.imagePath)
        if (job !== this.jobId) return
        this.acceptSourceImage(imageResult.image)
        if (imageResult.revoke) imageResult.revoke()
        this.computeFit()
        this.composedDirty = true
        this.requestRender()
        this.notifyPhase('loading', '准备 AI 模型（首次约需数秒）…')
        await this.ensureModel()
        if (job !== this.jobId) return
        this.notifyPhase('loading', '正在识别画面区域…')
        await this.segmentAndApply(job)
        if (job !== this.jobId) return
        this.composedDirty = true
        this.requestRender()
        this.notifyPhase('ready', '')
      } catch (e) {
        if (job !== this.jobId) return
        const message = this.errorText(e)
        console.error('[ai-render] 图片处理失败', e)
        this.notifyPhase('error', 'AI 分割失败', message)
      } finally {
        if (job === this.jobId) this.running = false
      }
    },
    async restartSegmentation() {
      if (!this.sourceImageData) {
        if (this.currentPayload && this.currentPayload.imagePath) this.startImageJob(this.currentPayload)
        return
      }
      const job = ++this.jobId
      this.running = true
      this.notifyPhase('loading', '重新准备 AI 模型…')
      try {
        await this.ensureModel()
        if (job !== this.jobId) return
        this.notifyPhase('loading', '正在重新识别画面区域…')
        await this.segmentAndApply(job)
        if (job !== this.jobId) return
        this.composedDirty = true
        this.requestRender()
        this.notifyPhase('ready', '')
      } catch (e) {
        if (job !== this.jobId) return
        console.error('[ai-render] 重新分割失败', e)
        this.notifyPhase('error', 'AI 分割失败', this.errorText(e))
      } finally {
        if (job === this.jobId) this.running = false
      }
    },
    clearImageState() {
      this.sourceImage = null
      this.sourceImageData = null
      this.sourceW = 0
      this.sourceH = 0
      this.workW = 0
      this.workH = 0
      this.sourceWork = null
      this.mask = null
      this.maskW = 0
      this.maskH = 0
      this.regionsRaw = []
      this.composedCanvas = null
      this.composedCtx = null
      this.layerScratch = null
      this.layerScratchCtx = null
      this.clearFilterCaches()
      this.maskCanvasCache = {}
      this.maskCanvasOrder = []
      this.maskAlphaCache = {}
      this.probCache = {}
      this.guideLow = null
      this.guideMean = null
      this.guideVar = null
      this.guideWork = null
      this.logitW = 0
      this.logitH = 0
      this.overlayCanvas = null
      this.overlayKey = ''
      this.overlayScratch = null
      this.overlayScratchCtx = null
      this.composedDirty = true
      this.view.zoom = 1
      this.view.offsetX = 0
      this.view.offsetY = 0
      this.view.fit = 1
    },
    acceptSourceImage(image) {
      const naturalW = image.naturalWidth || image.width
      const naturalH = image.naturalHeight || image.height
      if (!naturalW || !naturalH) throw new Error('图片尺寸无效')
      const scale = Math.min(1, MAX_SIDE / Math.max(naturalW, naturalH))
      const sw = Math.max(1, Math.round(naturalW * scale))
      const sh = Math.max(1, Math.round(naturalH * scale))
      const sourceCanvas = document.createElement('canvas')
      sourceCanvas.width = sw
      sourceCanvas.height = sh
      const sourceCtx = sourceCanvas.getContext('2d')
      sourceCtx.drawImage(image, 0, 0, sw, sh)
      this.sourceImage = image
      this.sourceW = sw
      this.sourceH = sh
      this.sourceImageData = sourceCtx.getImageData(0, 0, sw, sh)
      this.sourceWork = this.createWorkCanvas(sourceCanvas, sw, sh)
      this.workW = this.sourceWork.width
      this.workH = this.sourceWork.height
      this.composedCanvas = document.createElement('canvas')
      this.composedCanvas.width = this.workW
      this.composedCanvas.height = this.workH
      this.composedCtx = this.composedCanvas.getContext('2d')
      this.layerScratch = document.createElement('canvas')
      this.layerScratch.width = this.workW
      this.layerScratch.height = this.workH
      this.layerScratchCtx = this.layerScratch.getContext('2d')
      this.computeFit()
      this.log('图片尺寸 ' + sw + '×' + sh + '，工作尺寸 ' + this.workW + '×' + this.workH)
    },
    createWorkCanvas(sourceCanvas, sw, sh) {
      const scale = Math.min(1, WORK_MAX / Math.max(sw, sh))
      const ww = Math.max(1, Math.round(sw * scale))
      const wh = Math.max(1, Math.round(sh * scale))
      if (ww === sw && wh === sh) return sourceCanvas
      const canvas = document.createElement('canvas')
      canvas.width = ww
      canvas.height = wh
      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingEnabled = true
      ctx.drawImage(sourceCanvas, 0, 0, ww, wh)
      return canvas
    },

    // ================= 图片读取 =================
    localImageCandidates(path) {
      const list = []
      const add = (url) => {
        if (url && list.indexOf(url) < 0) list.push(url)
      }
      const raw = String(path || '')
      const isRelativeLocal = /^(_doc|_downloads|_documents)[/\\]/.test(raw)
      if (raw.indexOf('file://') === 0) {
        add(raw)
        add(raw.slice(7))
      } else if (raw[0] === '/' || isRelativeLocal) {
        add(raw)
        add('file://' + (raw[0] === '/' ? '' : '/') + raw)
      }
      if (window.plus && window.plus.io && window.plus.io.convertLocalFileSystemURL) {
        try {
          const local = window.plus.io.convertLocalFileSystemURL(raw)
          if (local) {
            add(local)
            add('file://' + (local[0] === '/' ? '' : '/') + local)
          }
        } catch (e) {}
      }
      return list
    },
    async loadImageSafe(path) {
      const raw = String(path || '')
      const protocol = raw.indexOf('://') > 0 ? raw.split('://')[0] : raw.indexOf(':') > 0 ? raw.split(':')[0] : '相对路径'
      this.log('图片地址: ' + raw + '（' + protocol + '，' + raw.length + ' 字符）')
      const direct = /^(data:|blob:|https?:)/.test(raw)
      if (!direct && window.plus && window.plus.io) {
        // 压缩后的图片通常只有几百 KB，DataURL 读取又快又稳定；
        // readAsArrayBuffer 在部分 Android WebView 上会一直不回调。
        try {
          const dataUrl = await this.readWithDataURL(raw)
          const image = await this.loadImage(dataUrl)
          this.log('图片经 plus.io DataURL 加载成功')
          return { image: image, revoke: null }
        } catch (e) {
          this.log('plus.io DataURL 读取图片失败，尝试分块读取: ' + this.errorText(e))
        }
        try {
          const bytes = await this.readWithPlus(raw)
          const type = this.sniffImageType(bytes)
          const blob = new Blob([bytes], { type: type })
          const url = URL.createObjectURL(blob)
          const image = await this.loadImage(url)
          return { image: image, revoke: () => URL.revokeObjectURL(url) }
        } catch (e) {
          this.log('plus.io 分块读取图片失败，尝试本地 URL: ' + this.errorText(e))
        }
        const candidates = this.localImageCandidates(raw)
        for (let i = 0; i < candidates.length; i++) {
          try {
            const image = await this.loadImage(candidates[i])
            this.log('图片经本地 URL 加载成功: ' + candidates[i])
            return { image: image, revoke: null }
          } catch (e) {
            this.log('本地 URL 加载失败: ' + candidates[i] + ' -> ' + this.errorText(e))
          }
        }
      }
      try {
        const image = await this.loadImage(raw)
        return { image: image, revoke: null }
      } catch (e) {
        throw new Error('图片加载失败: ' + this.errorText(e))
      }
    },
    loadImage(src) {
      return new Promise((resolve, reject) => {
        const image = new Image()
        image.onload = () => resolve(image)
        image.onerror = () => reject(new Error('无法解码图片'))
        image.src = src
      })
    },
    sniffImageType(bytes) {
      if (!bytes || bytes.byteLength < 12) return 'image/jpeg'
      const view = new Uint8Array(bytes, 0, 12)
      if (view[0] === 0x89 && view[1] === 0x50) return 'image/png'
      if (view[0] === 0x52 && view[1] === 0x49 && view[8] === 0x57) return 'image/webp'
      if (view[0] === 0x47 && view[1] === 0x49) return 'image/gif'
      return 'image/jpeg'
    },

    // ================= 模型与会话 =================
    async ensureModel() {
      if (this.session) return this.session
      if (this.sessionPromise) return this.sessionPromise
      this.sessionPromise = (async () => {
        await this.loadOrtScript()
        await this.loadAssets()
        const ort = window.ort
        if (!ort) throw new Error('ONNX Runtime 未加载')
        const env = ort.env
        env.wasm.numThreads = 1
        env.wasm.proxy = false
        env.wasm.wasmBinary = new Uint8Array(this.wasmBytes)
        this.notifyPhase('loading', '创建推理会话…')
        const started = Date.now()
        let session
        try {
          session = await ort.InferenceSession.create(new Uint8Array(this.modelBytes), {
            executionProviders: ['wasm'],
            graphOptimizationLevel: 'all',
          })
        } catch (e) {
          this.log('wasmBinary 创建会话失败: ' + this.errorText(e) + '，尝试 wasmPaths')
          env.wasm.wasmBinary = undefined
          env.wasm.wasmPaths = ASSET_BASE
          session = await ort.InferenceSession.create(new Uint8Array(this.modelBytes), {
            executionProviders: ['wasm'],
            graphOptimizationLevel: 'all',
          })
        }
        this.session = session
        this.log('会话创建成功 ' + (Date.now() - started) + 'ms')
        return session
      })()
      try {
        return await this.sessionPromise
      } catch (e) {
        this.sessionPromise = null
        throw e
      }
    },
    loadOrtScript() {
      if (window.ort && window.ort.InferenceSession) return Promise.resolve()
      if (this.scriptPromise) return this.scriptPromise
      this.scriptPromise = new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-ai-ort]')
        if (existing) {
          existing.addEventListener('load', () => resolve())
          existing.addEventListener('error', () => reject(new Error('ONNX Runtime 脚本加载失败')))
          return
        }
        const script = document.createElement('script')
        script.src = ORT_FILE
        script.async = true
        script.setAttribute('data-ai-ort', '1')
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('ONNX Runtime 脚本加载失败'))
        document.head.appendChild(script)
      })
      this.scriptPromise.catch(() => {
        this.scriptPromise = null
      })
      return this.scriptPromise
    },
    async loadAssets() {
      if (this.wasmBytes && this.modelBytes) return
      if (this.assetsPromise) return this.assetsPromise
      this.assetsPromise = (async () => {
        this.notifyPhase('loading', '读取 AI 模型资源（约 28MB）…')
        const started = Date.now()
        if (!this.wasmBytes) {
          const wasm = await this.readAsset(WASM_FILE)
          this.wasmBytes = wasm
        }
        if (!this.modelBytes) {
          const model = await this.readAsset(MODEL_FILE)
          this.modelBytes = model
        }
        this.log(
          '资源就绪 ' +
            (Date.now() - started) +
            'ms，WASM ' +
            this.formatBytes(this.wasmBytes.byteLength) +
            '，模型 ' +
            this.formatBytes(this.modelBytes.byteLength),
        )
      })()
      try {
        await this.assetsPromise
      } finally {
        this.assetsPromise = null
      }
    },
    async readAsset(path) {
      const errors = []
      if (window.plus && window.plus.io) {
        let lastPct = 0
        try {
          this.log('plus.io 读取资源: ' + path)
          return await this.readWithPlus(path, (loaded, total) => {
            const pct = Math.floor((loaded / total) * 100)
            if (pct >= lastPct + 25) {
              lastPct = pct
              this.log('资源读取 ' + path + ' ' + pct + '%')
            }
          })
        } catch (e) {
          errors.push('plus: ' + this.errorText(e))
          this.log('plus.io 读取资源失败: ' + this.errorText(e))
        }
      }
      try {
        return await this.fetchArrayBuffer(path)
      } catch (e) {
        errors.push('fetch: ' + this.errorText(e))
      }
      try {
        return await this.xhrArrayBuffer(path)
      } catch (e) {
        errors.push('xhr: ' + this.errorText(e))
      }
      throw new Error('资源读取失败 ' + path + ' -> ' + errors.join(' / '))
    },
    plusCandidates(path) {
      const list = []
      const clean = path.replace(/^\.\//, '')
      const isAppAsset = !/^(file:|content:|\/|_doc|_downloads|_documents)/.test(path)
      if (isAppAsset) list.push('_www/' + clean)
      list.push(path)
      list.push(clean)
      list.push('file:///' + clean)
      if (isAppAsset && typeof location !== 'undefined') {
        try {
          const abs = new URL(clean, location.href.split('#')[0]).href
          list.push(abs)
          if (abs.indexOf('file://') === 0) list.push(abs.slice(7))
        } catch (e) {}
      }
      if (window.plus && window.plus.io && window.plus.io.convertLocalFileSystemURL) {
        try {
          list.push(window.plus.io.convertLocalFileSystemURL(clean))
        } catch (e) {}
      }
      return list.filter((item, index) => item && list.indexOf(item) === index)
    },
    resolvePlusFile(path) {
      return new Promise((resolve, reject) => {
        const plus = window.plus
        if (!plus || !plus.io) {
          reject(new Error('plus.io 不可用'))
          return
        }
        const candidates = this.plusCandidates(path)
        let index = 0
        const tryNext = () => {
          if (index >= candidates.length) {
            reject(new Error('plus.io 无法解析路径: ' + path))
            return
          }
          const candidate = candidates[index++]
          let settled = false
          const timer = setTimeout(() => {
            if (settled) return
            settled = true
            this.log('plus.io 路径解析超时: ' + candidate)
            tryNext()
          }, PLUS_RESOLVE_TIMEOUT)
          const onEntryFile = (file) => {
            if (settled) return
            settled = true
            clearTimeout(timer)
            this.log('plus.io 已解析: ' + candidate + '，大小 ' + (Number(file && file.size) || 0) + ' 字节')
            resolve(file)
          }
          const onEntryFail = () => {
            if (settled) return
            settled = true
            clearTimeout(timer)
            tryNext()
          }
          plus.io.resolveLocalFileSystemURL(
            candidate,
            (entry) => {
              entry.file(onEntryFile, onEntryFail)
            },
            onEntryFail,
          )
        }
        tryNext()
      })
    },
    async readWithPlus(path, onProgress) {
      const file = await this.resolvePlusFile(path)
      return this.readFileInChunks(file, onProgress)
    },
    readWithDataURL(path) {
      return this.resolvePlusFile(path).then(
        (file) =>
          new Promise((resolve, reject) => {
            const reader = new window.plus.io.FileReader()
            let settled = false
            const timer = setTimeout(() => {
              if (settled) return
              settled = true
              try {
                reader.abort()
              } catch (e) {}
              reject(new Error('plus.io DataURL 读取超时'))
            }, PLUS_DATAURL_TIMEOUT)
            const finish = (error, url) => {
              if (settled) return
              settled = true
              clearTimeout(timer)
              if (error) reject(error)
              else resolve(url)
            }
            reader.onloadend = (event) => {
              const result = event && event.target ? event.target.result : null
              if (typeof result === 'string' && result.indexOf('data:') === 0) {
                finish(null, result)
              } else {
                finish(new Error('plus.io DataURL 返回类型异常'))
              }
            }
            reader.onerror = () => finish(new Error('plus.io DataURL 读取失败'))
            reader.readAsDataURL(file)
          }),
      )
    },
    async readFileInChunks(file, onProgress) {
      const total = Number(file && file.size) || 0
      if (!total) throw new Error('plus.io 文件大小无效')
      if (total <= PLUS_CHUNK_SIZE) {
        const whole = await this.readPlusBlob(file, total)
        return whole
      }
      const out = new Uint8Array(total)
      let offset = 0
      while (offset < total) {
        const end = Math.min(offset + PLUS_CHUNK_SIZE, total)
        let slice = null
        if (typeof file.slice === 'function') {
          try {
            slice = file.slice(offset, end)
          } catch (e) {}
        }
        if ((!slice || Number(slice.size) !== end - offset) && typeof Blob !== 'undefined') {
          try {
            slice = Blob.prototype.slice.call(file, offset, end)
          } catch (e) {}
        }
        if (!slice || Number(slice.size) !== end - offset) {
          throw new Error('plus.io File.slice 不可用，无法分块读取')
        }
        const buffer = await this.readPlusBlob(slice, end - offset)
        out.set(new Uint8Array(buffer), offset)
        offset = end
        if (onProgress) onProgress(offset, total)
        await new Promise((resolve) => setTimeout(resolve, 0))
      }
      return out.buffer
    },
    readPlusBlob(blob, expectedSize) {
      return new Promise((resolve, reject) => {
        const reader = new window.plus.io.FileReader()
        let settled = false
        const timer = setTimeout(() => {
          if (settled) return
          settled = true
          try {
            reader.abort()
          } catch (e) {}
          reject(new Error('plus.io 分块读取超时'))
        }, PLUS_CHUNK_TIMEOUT)
        const finish = (error, buffer) => {
          if (settled) return
          settled = true
          clearTimeout(timer)
          if (error) reject(error)
          else resolve(buffer)
        }
        reader.onloadend = (event) => {
          const result = event && event.target ? event.target.result : null
          let buffer = null
          if (result instanceof ArrayBuffer) buffer = result
          else if (result && result.buffer instanceof ArrayBuffer) buffer = result.buffer
          if (!buffer) {
            finish(new Error('plus.io 返回类型异常'))
            return
          }
          if (expectedSize && buffer.byteLength !== expectedSize) {
            finish(new Error('plus.io 分块长度异常: ' + buffer.byteLength + '/' + expectedSize))
            return
          }
          finish(null, buffer)
        }
        reader.onerror = () => finish(new Error('plus.io 读取失败'))
        reader.readAsArrayBuffer(blob)
      })
    },
    fetchArrayBuffer(path) {
      return fetch(path, { cache: 'no-store' }).then((response) => {
        if (!response.ok) throw new Error('HTTP ' + response.status)
        return response.arrayBuffer()
      })
    },
    xhrArrayBuffer(path) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('GET', path, true)
        xhr.responseType = 'arraybuffer'
        xhr.onload = () => {
          if (xhr.status === 200 || xhr.status === 0) {
            if (xhr.response instanceof ArrayBuffer) resolve(xhr.response)
            else reject(new Error('XHR 返回类型异常'))
          } else {
            reject(new Error('HTTP ' + xhr.status))
          }
        }
        xhr.onerror = () => reject(new Error('XHR 网络错误'))
        xhr.send()
      })
    },

    // ================= 分割 =================
    async segmentAndApply(job) {
      const session = this.session
      if (!session || !this.sourceImageData) throw new Error('模型或图片尚未就绪')
      this.notifyPhase('loading', '模型推理中…')
      const started = Date.now()
      const inputName = session.inputNames[0]
      const outputName = session.outputNames[0]
      // 某些导出模型虽然标了动态维度，实际只接受较小的尺寸。
      // 依次尝试 1024 → 768 → 512，成功后记住该设备的可用尺寸。
      const preferred = this.inferSize || INFER_SIZE
      const attempts = [preferred]
      for (let i = 0; i < INFER_FALLBACKS.length; i++) {
        const size = INFER_FALLBACKS[i]
        if (size < preferred && attempts.indexOf(size) < 0) attempts.push(size)
      }
      let results = null
      let usedSize = 0
      let lastError = null
      for (let i = 0; i < attempts.length; i++) {
        const size = attempts[i]
        try {
          this.log('推理尺寸 ' + size + '×' + size)
          const input = this.preprocess(this.sourceImageData, size)
          results = await session.run({ [inputName]: input })
          usedSize = size
          break
        } catch (e) {
          lastError = e
          this.log('推理尺寸 ' + size + ' 失败: ' + this.errorText(e))
        }
      }
      if (!results) throw lastError || new Error('模型推理失败')
      this.inferSize = usedSize
      if (job !== this.jobId) return
      const output = results[outputName]
      if (!output || !output.dims || output.dims.length !== 4) {
        throw new Error('模型输出维度异常')
      }
      const dims = output.dims
      const numClasses = dims[1]
      const outH = dims[2]
      const outW = dims[3]
      const logits = output.data
      if (!(logits instanceof Float32Array)) throw new Error('模型输出类型异常')
      this.log(
        '推理 ' +
          (Date.now() - started) +
          'ms（输入 ' +
          usedSize +
          '），输出 ' +
          JSON.stringify(dims),
      )

      const small = this.argmaxNCHW(logits, outW, outH, numClasses)
      for (let i = 0; i < small.length; i++) small[i] += 1
      const refined = this.bilinearRefineNCHW(
        logits,
        small,
        outW,
        outH,
        this.workW,
        this.workH,
      )
      const mask = this.majorityFilter(refined, this.workW, this.workH)
      if (job !== this.jobId) return

      this.mask = mask
      this.maskW = this.workW
      this.maskH = this.workH
      this.regionsRaw = this.collectRegions(mask)
      this.maskCanvasCache = {}
      this.maskCanvasOrder = []
      this.maskAlphaCache = {}
      this.probCache = {}
      this.overlayCanvas = null
      this.overlayKey = ''
      this.clearFilterCaches()

      // 用原图做引导，把模型输出的低分辨率类别概率细化到工作分辨率，
      // 让蒙版边缘贴合真实物体轮廓，而不是直接放大低分辨率结果。
      const topIds = this.regionsRaw.slice(0, REGION_LIMIT).map((item) => item.id)
      const refineStarted = Date.now()
      this.prepareRefinement(logits, numClasses, outW, outH, topIds)
      // 只预计算 alpha，画布等到真正合成某个区域时再创建，避免一次占用
      // 十几张工作分辨率 RGBA 画布。
      let refinedCount = 0
      for (let i = 0; i < topIds.length; i++) {
        const alpha = this.refineMaskAlpha(topIds[i])
        this.maskAlphaCache[topIds[i]] = alpha
        if (alpha) refinedCount++
      }
      this.log(
        '蒙版引导细化 ' +
          (Date.now() - refineStarted) +
          'ms，区域 ' +
          refinedCount +
          '/' +
          topIds.length +
          ' 个',
      )

      this.composedDirty = true
      this.notifyRegions(this.regionsRaw)
      this.log(
        '分割完成 ' +
          (Date.now() - started) +
          'ms，区域 ' +
          this.regionsRaw.length +
          ' 个（占比 ≥1%）',
      )
    },
    preprocess(image, requestedSize) {
      const size = requestedSize || INFER_SIZE
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      const src = document.createElement('canvas')
      src.width = image.width
      src.height = image.height
      src.getContext('2d').putImageData(image, 0, 0)
      ctx.drawImage(src, 0, 0, size, size)
      const scaled = ctx.getImageData(0, 0, size, size)
      const plane = size * size
      const data = new Float32Array(3 * plane)
      for (let i = 0; i < plane; i++) {
        const j = i * 4
        data[i] = (scaled.data[j] / 255 - MEAN[0]) / STD[0]
        data[plane + i] = (scaled.data[j + 1] / 255 - MEAN[1]) / STD[1]
        data[2 * plane + i] = (scaled.data[j + 2] / 255 - MEAN[2]) / STD[2]
      }
      return new window.ort.Tensor('float32', data, [1, 3, size, size])
    },
    argmaxNCHW(scores, width, height, numClasses) {
      const mask = new Uint8Array(width * height)
      const plane = width * height
      for (let i = 0; i < plane; i++) {
        let best = 0
        let bestScore = -Infinity
        for (let c = 0; c < numClasses; c++) {
          const s = scores[c * plane + i]
          if (s > bestScore) {
            bestScore = s
            best = c
          }
        }
        mask[i] = best
      }
      return mask
    },
    bilinearRefineNCHW(logits, smallMask, sw, sh, dw, dh) {
      const out = new Uint8Array(dw * dh)
      const plane = sw * sh
      const clampX = (x) => (x < 0 ? 0 : x >= sw ? sw - 1 : x)
      const clampY = (y) => (y < 0 ? 0 : y >= sh ? sh - 1 : y)
      const scaleX = sw / dw
      const scaleY = sh / dh
      for (let y = 0; y < dh; y++) {
        const fy = (y + 0.5) * scaleY - 0.5
        const y0 = Math.floor(fy)
        const wy = fy - y0
        const row0 = clampY(y0) * sw
        const row1 = clampY(y0 + 1) * sw
        const outRow = y * dw
        for (let x = 0; x < dw; x++) {
          const fx = (x + 0.5) * scaleX - 0.5
          const x0 = Math.floor(fx)
          const wx = fx - x0
          const ix0 = clampX(x0)
          const ix1 = clampX(x0 + 1)
          const w00 = (1 - wx) * (1 - wy)
          const w10 = wx * (1 - wy)
          const w01 = (1 - wx) * wy
          const w11 = wx * wy
          const p00 = row0 + ix0
          const p10 = row0 + ix1
          const p01 = row1 + ix0
          const p11 = row1 + ix1
          const c0 = smallMask[p00]
          const c1 = smallMask[p10] === c0 ? -1 : smallMask[p10]
          const c2 = smallMask[p01] === c0 || smallMask[p01] === c1 ? -1 : smallMask[p01]
          const c3 =
            smallMask[p11] === c0 || smallMask[p11] === c1 || smallMask[p11] === c2
              ? -1
              : smallMask[p11]
          let best = 0
          let bestScore = -Infinity
          const candidates = [c0, c1, c2, c3]
          for (let k = 0; k < 4; k++) {
            const cls = candidates[k]
            if (cls < 0) continue
            const p = (cls - 1) * plane
            const s =
              logits[p + p00] * w00 +
              logits[p + p10] * w10 +
              logits[p + p01] * w01 +
              logits[p + p11] * w11
            if (s > bestScore) {
              bestScore = s
              best = cls
            }
          }
          out[outRow + x] = best
        }
      }
      return out
    },
    majorityFilter(mask, width, height) {
      const out = new Uint8Array(mask.length)
      const values = new Uint8Array(9)
      for (let y = 0; y < height; y++) {
        const y0 = Math.max(0, y - 1)
        const y1 = Math.min(height - 1, y + 1)
        for (let x = 0; x < width; x++) {
          const x0 = Math.max(0, x - 1)
          const x1 = Math.min(width - 1, x + 1)
          let n = 0
          for (let yy = y0; yy <= y1; yy++) {
            for (let xx = x0; xx <= x1; xx++) {
              values[n++] = mask[yy * width + xx]
            }
          }
          let best = values[0]
          let bestCount = 0
          for (let i = 0; i < n; i++) {
            let count = 0
            for (let j = 0; j < n; j++) {
              if (values[j] === values[i]) count++
            }
            if (count > bestCount) {
              bestCount = count
              best = values[i]
            }
          }
          out[y * width + x] = best
        }
      }
      return out
    },
    // ================= 蒙版引导细化 =================
    // 模型输出只有输入尺寸的 1/4（1024 输入时为 256×256），
    // 直接放大必然出现块状边缘。这里用原图灰度作为引导图，
    // 对每个区域的类别概率做引导滤波，再把低分辨率的线性系数
    // a/b 双线性放大到工作分辨率，让蒙版边界贴合原图中的真实轮廓。
    boxMean(src, width, height, radius) {
      const out = new Float32Array(width * height)
      const stride = width + 1
      const integral = new Float64Array(stride * (height + 1))
      for (let y = 0; y < height; y++) {
        let rowSum = 0
        const srcRow = y * width
        const intRow = (y + 1) * stride
        const prevRow = y * stride
        for (let x = 0; x < width; x++) {
          rowSum += src[srcRow + x]
          integral[intRow + x + 1] = integral[prevRow + x + 1] + rowSum
        }
      }
      for (let y = 0; y < height; y++) {
        const y0 = y - radius < 0 ? 0 : y - radius
        const y1 = y + radius >= height ? height - 1 : y + radius
        const top = y0 * stride
        const bottom = (y1 + 1) * stride
        const outRow = y * width
        const areaY = y1 - y0 + 1
        for (let x = 0; x < width; x++) {
          const x0 = x - radius < 0 ? 0 : x - radius
          const x1 = x + radius >= width ? width - 1 : x + radius
          const sum =
            integral[bottom + x1 + 1] -
            integral[top + x1 + 1] -
            integral[bottom + x0] +
            integral[top + x0]
          out[outRow + x] = sum / (areaY * (x1 - x0 + 1))
        }
      }
      return out
    },
    grayscaleGuide(width, height) {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (this.sourceWork) ctx.drawImage(this.sourceWork, 0, 0, width, height)
      let data = null
      try {
        data = ctx.getImageData(0, 0, width, height).data
      } catch (e) {
        // 极少数情况下图片会以 file:// 直接加载，画布可能被标记为跨源，
        // 此时放弃细化并回退到粗分割，不能让整个识别失败。
        this.log('引导图读取失败，蒙版退回粗分割: ' + this.errorText(e))
        return null
      }
      const out = new Float32Array(width * height)
      for (let i = 0, j = 0; i < out.length; i++, j += 4) {
        out[i] = (data[j] * 0.299 + data[j + 1] * 0.587 + data[j + 2] * 0.114) / 255
      }
      return out
    },
    prepareRefinement(logits, numClasses, lw, lh, topIds) {
      const plane = lw * lh
      this.probCache = {}
      this.guideLow = null
      this.guideMean = null
      this.guideVar = null
      this.guideWork = null
      this.logitW = 0
      this.logitH = 0
      // 没有达到展示门槛的区域时，直接跳过整套细化计算。
      if (!topIds.length) return
      // 模型可能输出原始 logits，也可能已经过 softmax / sigmoid。
      // 抽样判断：若各类别值都落在 [0,1]，直接当概率用；否则做 softmax。
      // 不要求各类别求和为 1，以兼容逐类别 sigmoid 的输出。
      let looksLikeProb = true
      const step = Math.max(1, Math.floor(plane / 64))
      let checks = 0
      for (let i = 0; i < plane && checks < 64; i += step) {
        checks++
        for (let c = 0; c < numClasses; c++) {
          const v = logits[c * plane + i]
          if (v < -0.001 || v > 1.001) {
            looksLikeProb = false
            break
          }
        }
        if (!looksLikeProb) break
      }

      if (looksLikeProb) {
        for (let k = 0; k < topIds.length; k++) {
          const id = topIds[k]
          const cls = id - 1
          if (cls < 0 || cls >= numClasses) continue
          this.probCache[id] = logits.slice(cls * plane, cls * plane + plane)
        }
      } else {
        const maxArr = new Float32Array(plane)
        const sumArr = new Float32Array(plane)
        for (let i = 0; i < plane; i++) {
          let max = -Infinity
          for (let c = 0; c < numClasses; c++) {
            const v = logits[c * plane + i]
            if (v > max) max = v
          }
          let sum = 0
          for (let c = 0; c < numClasses; c++) {
            sum += Math.exp(logits[c * plane + i] - max)
          }
          maxArr[i] = max
          sumArr[i] = sum || 1
        }
        for (let k = 0; k < topIds.length; k++) {
          const id = topIds[k]
          const cls = id - 1
          if (cls < 0 || cls >= numClasses) continue
          const base = cls * plane
          const prob = new Float32Array(plane)
          for (let i = 0; i < plane; i++) {
            prob[i] = Math.exp(logits[base + i] - maxArr[i]) / sumArr[i]
          }
          this.probCache[id] = prob
        }
      }
      const lowGuide = this.grayscaleGuide(lw, lh)
      if (!lowGuide) {
        this.probCache = {}
        return
      }
      const workGuide = this.grayscaleGuide(this.workW, this.workH)
      if (!workGuide) {
        this.probCache = {}
        return
      }
      this.guideLow = lowGuide
      this.guideWork = workGuide
      this.guideMean = this.boxMean(lowGuide, lw, lh, REFINE_RADIUS)
      const square = new Float32Array(plane)
      for (let i = 0; i < plane; i++) square[i] = lowGuide[i] * lowGuide[i]
      const meanSquare = this.boxMean(square, lw, lh, REFINE_RADIUS)
      const variance = new Float32Array(plane)
      for (let i = 0; i < plane; i++) {
        const m = this.guideMean[i]
        variance[i] = meanSquare[i] - m * m
      }
      this.guideVar = variance
      this.logitW = lw
      this.logitH = lh
    },
    refineMaskAlpha(id) {
      const prob = this.probCache[id]
      if (!prob || !this.guideLow || !this.guideWork) return null
      const lw = this.logitW
      const lh = this.logitH
      const plane = lw * lh
      const meanP = this.boxMean(prob, lw, lh, REFINE_RADIUS)
      const ip = new Float32Array(plane)
      for (let i = 0; i < plane; i++) ip[i] = this.guideLow[i] * prob[i]
      const meanIP = this.boxMean(ip, lw, lh, REFINE_RADIUS)
      const a = new Float32Array(plane)
      const b = new Float32Array(plane)
      for (let i = 0; i < plane; i++) {
        const cov = meanIP[i] - this.guideMean[i] * meanP[i]
        const av = cov / (this.guideVar[i] + REFINE_EPS)
        a[i] = av
        b[i] = meanP[i] - av * this.guideMean[i]
      }
      const meanA = this.boxMean(a, lw, lh, REFINE_RADIUS)
      const meanB = this.boxMean(b, lw, lh, REFINE_RADIUS)

      const dw = this.workW
      const dh = this.workH
      const guide = this.guideWork
      const alpha = new Uint8ClampedArray(dw * dh)
      const scaleX = lw / dw
      const scaleY = lh / dh
      const clampX = (x) => (x < 0 ? 0 : x >= lw ? lw - 1 : x)
      const clampY = (y) => (y < 0 ? 0 : y >= lh ? lh - 1 : y)
      for (let y = 0; y < dh; y++) {
        const fy = (y + 0.5) * scaleY - 0.5
        const y0 = Math.floor(fy)
        const wy = fy - y0
        const row0 = clampY(y0) * lw
        const row1 = clampY(y0 + 1) * lw
        const outRow = y * dw
        for (let x = 0; x < dw; x++) {
          const fx = (x + 0.5) * scaleX - 0.5
          const x0 = Math.floor(fx)
          const wx = fx - x0
          const ix0 = clampX(x0)
          const ix1 = clampX(x0 + 1)
          const w00 = (1 - wx) * (1 - wy)
          const w10 = wx * (1 - wy)
          const w01 = (1 - wx) * wy
          const w11 = wx * wy
          const av =
            meanA[row0 + ix0] * w00 +
            meanA[row0 + ix1] * w10 +
            meanA[row1 + ix0] * w01 +
            meanA[row1 + ix1] * w11
          const bv =
            meanB[row0 + ix0] * w00 +
            meanB[row0 + ix1] * w10 +
            meanB[row1 + ix0] * w01 +
            meanB[row1 + ix1] * w11
          const idx = outRow + x
          const q = av * guide[idx] + bv
          // 窄过渡带：引导滤波已经让 q 贴合原图边缘，这里只保留约
          // 1–2 个工作像素的抗锯齿过渡，避免风格覆盖出现大范围渐变。
          let t = (q - 0.47) / 0.06
          if (t <= 0) t = 0
          else if (t >= 1) t = 1
          alpha[idx] = Math.round(t * t * (3 - 2 * t) * 255)
        }
      }
      return alpha
    },
    collectRegions(mask) {
      const counts = new Uint32Array(256)
      for (let i = 0; i < mask.length; i++) counts[mask[i]]++
      const total = mask.length
      const list = []
      for (let id = 1; id < 256; id++) {
        if (counts[id] === 0) continue
        const ratio = counts[id] / total
        // 不足 1% 的区域不展示，避免零碎噪点占满区域栏。
        if (ratio < MIN_REGION_RATIO) continue
        list.push({ id: id, count: counts[id], ratio: ratio })
      }
      list.sort((a, b) => b.count - a.count)
      return list
    },

    // ================= 风格合成 =================
    clearFilterCaches() {
      this.filteredCache = {}
    },
    presetMap() {
      const map = {}
      const presets = this.currentPayload && this.currentPayload.presets ? this.currentPayload.presets : []
      for (let i = 0; i < presets.length; i++) map[presets[i].key] = presets[i]
      return map
    },
    styleFilter(styleKey) {
      const preset = this.presetMap()[styleKey]
      if (!preset) return 'none'
      const recipe = preset.recipe
      const t = Math.max(0, Math.min(100, this.currentPayload.strength || 0)) / 100
      const saturate = 1 + (recipe.saturate - 1) * t
      const contrast = 1 + (recipe.contrast - 1) * t
      const brightness = 1 + (recipe.brightness - 1) * t
      const hue = recipe.hueRotate * t
      const sepia = (recipe.sepia || 0) * t
      const parts = []
      if (sepia > 0.001) parts.push('sepia(' + sepia.toFixed(3) + ')')
      parts.push('saturate(' + saturate.toFixed(3) + ')')
      parts.push('contrast(' + contrast.toFixed(3) + ')')
      parts.push('brightness(' + brightness.toFixed(3) + ')')
      parts.push('hue-rotate(' + hue.toFixed(2) + 'deg)')
      return parts.join(' ')
    },
    styleTemperature(styleKey) {
      const preset = this.presetMap()[styleKey]
      if (!preset) return null
      const t = Math.max(0, Math.min(100, this.currentPayload.strength || 0)) / 100
      const temperature = preset.recipe.temperature * t
      if (Math.abs(temperature) < 0.5) return null
      return {
        color: temperature > 0 ? '255,138,64' : '64,138,255',
        alpha: Math.min(0.24, (Math.abs(temperature) / 100) * 0.32),
      }
    },
    getFilteredCanvas(styleKey) {
      const strength = this.currentPayload.strength || 0
      const key = styleKey + '|' + strength
      const cached = this.filteredCache[key]
      if (cached) return cached
      const canvas = document.createElement('canvas')
      canvas.width = this.workW
      canvas.height = this.workH
      const ctx = canvas.getContext('2d')
      if (this.filterSupported) {
        ctx.filter = this.styleFilter(styleKey)
      }
      ctx.drawImage(this.sourceWork, 0, 0, this.workW, this.workH)
      ctx.filter = 'none'
      const tint = this.styleTemperature(styleKey)
      if (tint) {
        ctx.save()
        ctx.globalCompositeOperation = 'soft-light'
        ctx.fillStyle = 'rgba(' + tint.color + ',' + tint.alpha.toFixed(3) + ')'
        ctx.fillRect(0, 0, this.workW, this.workH)
        ctx.restore()
      }
      this.filteredCache[key] = canvas
      return canvas
    },
    getMaskCanvas(id) {
      const cached = this.maskCanvasCache[id]
      if (cached) return cached
      if (!this.mask) return null
      const canvas = document.createElement('canvas')
      canvas.width = this.workW
      canvas.height = this.workH
      const ctx = canvas.getContext('2d')

      const alpha = this.maskAlphaCache[id] || this.refineMaskAlpha(id)
      if (alpha) {
        this.maskAlphaCache[id] = alpha
        const imageData = ctx.createImageData(this.workW, this.workH)
        const data = imageData.data
        for (let i = 0; i < alpha.length; i++) {
          const j = i * 4
          data[j] = 255
          data[j + 1] = 255
          data[j + 2] = 255
          data[j + 3] = alpha[i]
        }
        ctx.putImageData(imageData, 0, 0)
      } else {
        // 非前 12 区域或细化不可用时，退回低分辨率二值蒙版
        const binaryCanvas = document.createElement('canvas')
        binaryCanvas.width = this.maskW
        binaryCanvas.height = this.maskH
        const binaryCtx = binaryCanvas.getContext('2d')
        const imageData = binaryCtx.createImageData(this.maskW, this.maskH)
        const data = imageData.data
        for (let i = 0; i < this.mask.length; i++) {
          if (this.mask[i] === id) {
            const j = i * 4
            data[j] = 255
            data[j + 1] = 255
            data[j + 2] = 255
            data[j + 3] = 255
          }
        }
        binaryCtx.putImageData(imageData, 0, 0)
        ctx.imageSmoothingEnabled = true
        if (this.filterSupported) ctx.filter = 'blur(1.2px)'
        ctx.drawImage(binaryCanvas, 0, 0, this.workW, this.workH)
        ctx.filter = 'none'
      }

      this.maskCanvasCache[id] = canvas
      this.maskCanvasOrder.push(id)
      while (this.maskCanvasOrder.length > MASK_CACHE_LIMIT) {
        const oldest = this.maskCanvasOrder.shift()
        delete this.maskCanvasCache[oldest]
      }
      return canvas
    },
    visibleRegionIds(selectedId) {
      const ids = this.regionsRaw.slice(0, REGION_LIMIT).map((item) => item.id)
      const selected = selectedId === null || selectedId === undefined ? null : Number(selectedId)
      if (selected && ids.indexOf(selected) < 0) {
        // 只补入仍满足 1% 门槛的区域；低于门槛的区域不显示。
        const known = this.regionsRaw.some((item) => item.id === selected)
        if (known) ids.unshift(selected)
      }
      return ids
    },
    getOverlayCanvas(selectedId) {
      const key = selectedId === null || selectedId === undefined ? 'none' : String(selectedId)
      if (this.overlayCanvas && this.overlayKey === key) return this.overlayCanvas
      if (!this.mask) return null
      if (!this.overlayCanvas) {
        this.overlayCanvas = document.createElement('canvas')
        this.overlayCanvas.width = this.workW
        this.overlayCanvas.height = this.workH
      }
      if (!this.overlayScratch) {
        this.overlayScratch = document.createElement('canvas')
        this.overlayScratch.width = this.workW
        this.overlayScratch.height = this.workH
        this.overlayScratchCtx = this.overlayScratch.getContext('2d')
      }
      const canvas = this.overlayCanvas
      const ctx = canvas.getContext('2d')
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.globalCompositeOperation = 'source-over'
      ctx.clearRect(0, 0, this.workW, this.workH)
      const scratch = this.overlayScratchCtx
      const ids = this.visibleRegionIds(selectedId)
      // 选中的区域最后画，避免被相邻区域的提示色盖住。
      const selectedIndex = ids.findIndex((id) => String(id) === key)
      if (selectedIndex >= 0 && selectedIndex < ids.length - 1) {
        const selectedIdValue = ids.splice(selectedIndex, 1)[0]
        ids.push(selectedIdValue)
      }
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i]
        const maskCanvas = this.getMaskCanvas(id)
        if (!maskCanvas) continue
        let color = this.colorCache[id]
        if (!color) {
          color = this.classColor(id)
          this.colorCache[id] = color
        }
        const alpha = (String(id) === key ? 112 : 52) / 255
        scratch.setTransform(1, 0, 0, 1, 0, 0)
        scratch.globalCompositeOperation = 'source-over'
        scratch.clearRect(0, 0, this.workW, this.workH)
        scratch.drawImage(maskCanvas, 0, 0)
        scratch.globalCompositeOperation = 'source-in'
        scratch.fillStyle = 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',' + alpha + ')'
        scratch.fillRect(0, 0, this.workW, this.workH)
        scratch.globalCompositeOperation = 'source-over'
        ctx.drawImage(this.overlayScratch, 0, 0)
      }
      this.overlayKey = key
      return canvas
    },
    classColor(id) {
      // 黄金角散列：让相邻类别 id 也得到差异明显的颜色，
      // 避免多个区域在画布上呈现为一片相近的色块。
      const hue = (id * 137.508) % 360
      const sat = 70 + (id % 3) * 8
      const light = 46 + (id % 2) * 8
      return this.hslToRgb(hue / 360, sat / 100, light / 100)
    },
    hslToRgb(h, s, l) {
      let r
      let g
      let b
      if (s === 0) {
        r = g = b = l
      } else {
        const hue2rgb = (p, q, t) => {
          if (t < 0) t += 1
          if (t > 1) t -= 1
          if (t < 1 / 6) return p + (q - p) * 6 * t
          if (t < 1 / 2) return q
          if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
          return p
        }
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s
        const p = 2 * l - q
        r = hue2rgb(p, q, h + 1 / 3)
        g = hue2rgb(p, q, h)
        b = hue2rgb(p, q, h - 1 / 3)
      }
      // 向白色混合，降低蒙版饱和度，只作为区域提示
      return [
        Math.round(r * 255 * 0.7 + 255 * 0.3),
        Math.round(g * 255 * 0.7 + 255 * 0.3),
        Math.round(b * 255 * 0.7 + 255 * 0.3),
      ]
    },
    compose() {
      if (!this.composedCtx || !this.sourceWork) return
      const ctx = this.composedCtx
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, this.workW, this.workH)
      const payload = this.currentPayload || {}
      const comparing = !!payload.comparing

      if (comparing) {
        ctx.drawImage(this.sourceWork, 0, 0, this.workW, this.workH)
        this.composedDirty = false
        return
      }

      const fullStyle = payload.fullStyle || ''
      if (fullStyle && fullStyle !== RESTORE_KEY && this.filterSupported) {
        ctx.drawImage(this.getFilteredCanvas(fullStyle), 0, 0, this.workW, this.workH)
      } else {
        ctx.drawImage(this.sourceWork, 0, 0, this.workW, this.workH)
      }

      const styles = payload.regionStyles || {}
      const ids = Object.keys(styles)
      if (ids.length && this.layerScratchCtx) {
        for (let i = 0; i < ids.length; i++) {
          const id = Number(ids[i])
          const styleKey = styles[ids[i]]
          if (!styleKey || styleKey === RESTORE_KEY) continue
          const maskCanvas = this.getMaskCanvas(id)
          if (!maskCanvas) continue
          const layer = this.layerScratchCtx
          layer.setTransform(1, 0, 0, 1, 0, 0)
          layer.globalCompositeOperation = 'source-over'
          layer.clearRect(0, 0, this.workW, this.workH)
          layer.drawImage(this.getFilteredCanvas(styleKey), 0, 0, this.workW, this.workH)
          layer.globalCompositeOperation = 'destination-in'
          layer.drawImage(maskCanvas, 0, 0, this.workW, this.workH)
          layer.globalCompositeOperation = 'source-over'
          ctx.drawImage(this.layerScratch, 0, 0, this.workW, this.workH)
        }
      }

      if (payload.showMask && this.mask) {
        const overlay = this.getOverlayCanvas(payload.selectedRegion)
        if (overlay) ctx.drawImage(overlay, 0, 0, this.workW, this.workH)
      }
      this.composedDirty = false
    },
    requestRender() {
      if (this.rafId) return
      this.rafId = requestAnimationFrame(() => {
        this.rafId = 0
        this.draw()
      })
    },
    draw() {
      if (!this.ctx || !this.canvas) return
      const ctx = this.ctx
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.fillStyle = '#121214'
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
      if (!this.sourceWork || !this.workW || !this.workH) return
      if (this.composedDirty || !this.composedCanvas) this.compose()
      if (!this.composedCanvas) return
      this.computeFit()
      const scale = this.view.fit * this.view.zoom
      const width = this.workW * scale
      const height = this.workH * scale
      const x = (this.canvas.width - width) / 2 + this.view.offsetX
      const y = (this.canvas.height - height) / 2 + this.view.offsetY
      ctx.imageSmoothingEnabled = true
      if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(this.composedCanvas, x, y, width, height)
    },

    // ================= 手势 =================
    touchPoint(event) {
      const touch = event.touches && event.touches[0] ? event.touches[0] : null
      if (touch) return { x: touch.clientX, y: touch.clientY }
      const changed = event.changedTouches && event.changedTouches[0]
      if (changed) return { x: changed.clientX, y: changed.clientY }
      return null
    },
    handleTouchStart(event) {
      this.hasTouchSeen = true
      if (event.cancelable) event.preventDefault()
      const point = this.touchPoint(event)
      if (!point) return
      if (event.touches && event.touches.length > 1) {
        this.touchState.active = false
        return
      }
      this.beginGesture(point.x, point.y)
    },
    handleTouchMove(event) {
      if (!this.touchState.active) return
      if (event.cancelable) event.preventDefault()
      const point = this.touchPoint(event)
      if (!point) return
      this.moveGesture(point.x, point.y)
    },
    handleTouchEnd(event) {
      if (!this.touchState.active) return
      const point = this.touchPoint(event) || {
        x: this.touchState.lastX,
        y: this.touchState.lastY,
      }
      this.endGesture(point.x, point.y)
    },
    handleMouseDown(event) {
      if (this.hasTouchSeen || event.button !== 0) return
      event.preventDefault()
      this.beginGesture(event.clientX, event.clientY)
      this.onMouseMove = this.onMouseMove || ((e) => this.handleMouseMove(e))
      this.onMouseUp = this.onMouseUp || ((e) => this.handleMouseUp(e))
      window.addEventListener('mousemove', this.onMouseMove)
      window.addEventListener('mouseup', this.onMouseUp)
    },
    handleMouseMove(event) {
      if (!this.touchState.active) return
      this.moveGesture(event.clientX, event.clientY)
    },
    handleMouseUp(event) {
      window.removeEventListener('mousemove', this.onMouseMove)
      window.removeEventListener('mouseup', this.onMouseUp)
      if (!this.touchState.active) return
      this.endGesture(event.clientX, event.clientY)
    },
    beginGesture(clientX, clientY) {
      this.touchState.active = true
      this.touchState.startX = clientX
      this.touchState.startY = clientY
      this.touchState.lastX = clientX
      this.touchState.lastY = clientY
      this.touchState.moved = false
      this.touchState.startTime = Date.now()
    },
    moveGesture(clientX, clientY) {
      const dx = clientX - this.touchState.lastX
      const dy = clientY - this.touchState.lastY
      const totalX = clientX - this.touchState.startX
      const totalY = clientY - this.touchState.startY
      if (Math.abs(totalX) > 6 || Math.abs(totalY) > 6) this.touchState.moved = true
      if (this.view.zoom > 1 && this.touchState.moved) {
        this.view.offsetX += dx * this.dpr
        this.view.offsetY += dy * this.dpr
        this.clampOffsets()
        this.requestRender()
      }
      this.touchState.lastX = clientX
      this.touchState.lastY = clientY
    },
    endGesture(clientX, clientY) {
      const state = this.touchState
      state.active = false
      const duration = Date.now() - state.startTime
      if (state.moved || duration > 420) return
      this.handleTap(clientX, clientY)
    },
    handleTap(clientX, clientY) {
      const now = Date.now()
      const isDouble =
        now - this.lastTapTime < 280 &&
        Math.abs(clientX - this.lastTapX) < 32 &&
        Math.abs(clientY - this.lastTapY) < 32
      this.lastTapTime = now
      this.lastTapX = clientX
      this.lastTapY = clientY
      if (isDouble) {
        if (this.singleTapTimer) {
          clearTimeout(this.singleTapTimer)
          this.singleTapTimer = null
        }
        this.toggleZoom(clientX, clientY)
        return
      }
      if (this.singleTapTimer) clearTimeout(this.singleTapTimer)
      this.singleTapTimer = setTimeout(() => {
        this.singleTapTimer = null
        this.handleSingleTap(clientX, clientY)
      }, 300)
    },
    handleSingleTap(clientX, clientY) {
      const payload = this.currentPayload || {}
      if (payload.previewing) {
        this.notifyExitPreview()
        return
      }
      if (payload.activeTool !== 'ai' || !this.mask) return
      if (payload.rotation && Number(payload.rotation) % 360 !== 0) return
      if (payload.flipX) return
      const id = this.pickRegion(clientX, clientY)
      if (id === null) return
      this.notifyPick(id)
    },
    pickRegion(clientX, clientY) {
      if (!this.host || !this.mask) return null
      const rect = this.host.getBoundingClientRect()
      if (!rect) return null
      const px = (clientX - rect.left) * this.dpr
      const py = (clientY - rect.top) * this.dpr
      const scale = this.view.fit * this.view.zoom
      if (!scale) return null
      const left = (this.canvas.width - this.workW * scale) / 2 + this.view.offsetX
      const top = (this.canvas.height - this.workH * scale) / 2 + this.view.offsetY
      const x = (px - left) / scale
      const y = (py - top) / scale
      if (x < 0 || y < 0 || x >= this.workW || y >= this.workH) return null
      const mx = Math.min(this.maskW - 1, Math.floor(x))
      const my = Math.min(this.maskH - 1, Math.floor(y))
      // 优先用细化蒙版的 alpha 拾取，边缘点击更贴近可见边界
      const ids = this.visibleRegionIds(null)
      let bestId = null
      let bestAlpha = 0
      const index = my * this.maskW + mx
      for (let i = 0; i < ids.length; i++) {
        const alpha = this.maskAlphaCache[ids[i]]
        if (!alpha) continue
        const value = alpha[index]
        if (value > bestAlpha) {
          bestAlpha = value
          bestId = ids[i]
        }
      }
      if (bestId !== null && bestAlpha >= 64) return bestId
      const id = this.mask[index]
      if (id === 0) return null
      // 回退到粗蒙版时同样只允许选中达到 1% 门槛的区域，
      // 否则会选中一个在区域栏里根本不存在的零碎区域。
      for (let i = 0; i < this.regionsRaw.length; i++) {
        if (this.regionsRaw[i].id === id) return id
      }
      return null
    },
    toggleZoom(clientX, clientY) {
      if (!this.host || !this.sourceWork) return
      const rect = this.host.getBoundingClientRect()
      if (!rect) return
      const px = (clientX - rect.left) * this.dpr
      const py = (clientY - rect.top) * this.dpr
      if (this.view.zoom > 1) {
        this.view.zoom = 1
        this.view.offsetX = 0
        this.view.offsetY = 0
        this.requestRender()
        return
      }
      this.computeFit()
      const fit = this.view.fit
      const baseX = (this.canvas.width - this.workW * fit) / 2
      const baseY = (this.canvas.height - this.workH * fit) / 2
      const ix = (px - baseX) / fit
      const iy = (py - baseY) / fit
      if (ix < 0 || iy < 0 || ix > this.workW || iy > this.workH) return
      this.view.zoom = 2
      const scale = fit * 2
      const centeredX = (this.canvas.width - this.workW * scale) / 2
      const centeredY = (this.canvas.height - this.workH * scale) / 2
      this.view.offsetX = px - ix * scale - centeredX
      this.view.offsetY = py - iy * scale - centeredY
      this.clampOffsets()
      this.requestRender()
    },
    clampOffsets() {
      const scale = this.view.fit * this.view.zoom
      const sw = this.workW * scale
      const sh = this.workH * scale
      const cw = this.canvas.width
      const ch = this.canvas.height
      if (sw <= cw) {
        this.view.offsetX = 0
      } else {
        const centered = (cw - sw) / 2
        const min = cw - sw - centered
        const max = -centered
        this.view.offsetX = Math.max(min, Math.min(max, this.view.offsetX))
      }
      if (sh <= ch) {
        this.view.offsetY = 0
      } else {
        const centered = (ch - sh) / 2
        const min = ch - sh - centered
        const max = -centered
        this.view.offsetY = Math.max(min, Math.min(max, this.view.offsetY))
      }
    },

    // ================= 工具 =================
    formatBytes(bytes) {
      if (!bytes && bytes !== 0) return '未知'
      if (bytes < 1024) return bytes + ' B'
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
      return (bytes / 1024 / 1024).toFixed(2) + ' MB'
    },
    errorText(error) {
      if (!error) return '未知错误'
      if (error.message) return error.message
      return String(error)
    },
  },
}
</script>

<style lang="scss" scoped>
.ai-canvas-stage {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
