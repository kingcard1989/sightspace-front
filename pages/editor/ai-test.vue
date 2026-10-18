<template>
  <view class="ai-test">
    <view class="ai-test__head">
      <text class="ai-test__title">AI 分割自检</text>
      <text class="ai-test__sub">ONNX Runtime Web · Android 真机验证</text>
    </view>

    <view class="ai-test__actions">
      <button class="ai-test__btn ai-test__btn--primary" :disabled="busy" @click="runSelfTest">
        {{ busy ? '运行中…' : '开始自检' }}
      </button>
      <button class="ai-test__btn" :disabled="busy" @click="chooseImage">选择图片</button>
      <button class="ai-test__btn" @click="copyLog">复制日志</button>
    </view>

    <view
      id="aiTestStage"
      class="ai-test__stage"
      :test-payload="testPayload"
      :change:test-payload="renderjs.onPayloadChange"
    ></view>

    <view class="ai-test__status" :class="'is-' + phase">
      <view class="ai-test__status-dot"></view>
      <text class="ai-test__status-text">{{ statusText }}</text>
      <text v-if="imageName" class="ai-test__image-name">{{ imageName }}</text>
    </view>

    <view v-if="summary.length" class="ai-test__summary">
      <text v-for="(line, i) in summary" :key="i" class="ai-test__summary-line">{{ line }}</text>
    </view>

    <scroll-view class="ai-test__log" scroll-y>
      <text v-for="(line, i) in logs" :key="i" class="ai-test__line">{{ line }}</text>
      <text v-if="!logs.length" class="ai-test__line ai-test__line--muted">
        等待自检开始…
      </text>
    </scroll-view>
  </view>
</template>

<script>
const MAX_LOG_LINES = 240

export default {
  data() {
    return {
      logs: [],
      runToken: 0,
      imageSrc: '',
      imageName: '',
      busy: false,
      phase: 'idle',
      statusText: '尚未运行',
      summary: [],
      autoStarted: false,
    }
  },
  computed: {
    testPayload() {
      return JSON.stringify({ token: this.runToken, image: this.imageSrc })
    },
  },
  onReady() {
    // renderjs 挂载完成后再触发一次变化，确保首次自检能拿到 ownerInstance
    setTimeout(() => {
      if (this.autoStarted) return
      this.autoStarted = true
      this.startTest('自动自检')
    }, 900)
  },
  methods: {
    startTest(reason) {
      if (this.busy) {
        uni.showToast({ title: '自检进行中', icon: 'none' })
        return
      }
      this.logs = []
      this.summary = []
      this.phase = 'running'
      this.statusText = reason + '：准备中…'
      this.busy = true
      this.runToken += 1
    },
    runSelfTest() {
      this.imageSrc = ''
      this.imageName = ''
      this.startTest('手动自检')
    },
    chooseImage() {
      if (this.busy) return
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const path = res.tempFilePaths && res.tempFilePaths[0]
          if (!path) {
            uni.showToast({ title: '没有取到图片路径', icon: 'none' })
            return
          }
          this.imageName = (res.tempFiles && res.tempFiles[0] && res.tempFiles[0].name) || path.split('/').pop() || '已选择图片'
          this.logs = []
          this.summary = []
          this.phase = 'running'
          this.statusText = '压缩图片…'
          this.busy = true
          this.pushLog('相册原始路径: ' + path)
          this.compressForTest(path, (finalPath) => {
            this.pushLog('送入自检的图片路径: ' + finalPath)
            this.imageSrc = finalPath
            this.statusText = '读取所选图片…'
            this.runToken += 1
          })
        },
        fail: (err) => {
          this.pushLog('选择图片失败: ' + (err && err.errMsg ? err.errMsg : String(err)))
          uni.showToast({ title: '选择图片失败', icon: 'none' })
        },
      })
    },
    compressForTest(path, done) {
      let finished = false
      const finish = (finalPath) => {
        if (finished) return
        finished = true
        done(finalPath || path)
      }
      try {
        uni.compressImage({
          src: path,
          quality: 95,
          success: (res) => finish(res && res.tempFilePath ? res.tempFilePath : path),
          fail: (err) => {
            this.pushLog('compressImage 失败，使用原路径: ' + (err && err.errMsg ? err.errMsg : String(err)))
            finish(path)
          },
        })
      } catch (e) {
        this.pushLog('compressImage 异常，使用原路径: ' + (e && e.message ? e.message : e))
        finish(path)
      }
    },
    copyLog() {
      const text = this.logs.join('\n') || '暂无日志'
      uni.setClipboardData({
        data: text,
        success: () => uni.showToast({ title: '日志已复制', icon: 'none' }),
      })
    },
    pushLog(line) {
      this.logs.push(line)
      if (this.logs.length > MAX_LOG_LINES) this.logs.splice(0, this.logs.length - MAX_LOG_LINES)
    },
    onRenderLog(line) {
      this.pushLog(line)
    },
    onRenderState(state) {
      if (!state) return
      if (state.phase) this.phase = state.phase
      if (state.text) this.statusText = state.text
      if (state.phase === 'done' || state.phase === 'error') this.busy = false
    },
    onRenderResult(result) {
      this.busy = false
      this.phase = 'done'
      this.statusText = '自检完成'
      this.summary = result && result.lines ? result.lines : []
    },
  },
}
</script>

<script module="renderjs" lang="renderjs">
const ASSET_BASE = './static/ai/'
const ORT_SCRIPT = ASSET_BASE + 'ort.wasm.min.js'
const WASM_FILE = ASSET_BASE + 'ort-wasm-simd-threaded.wasm'
const MODEL_FILE = ASSET_BASE + 'segmentation.onnx'
const INPUT_SIZE = 512
const MAX_SIDE = 1024
const MEAN = [0.485, 0.456, 0.406]
const STD = [0.229, 0.224, 0.225]
const STAGE_HEIGHT = 300
const PLUS_CHUNK_SIZE = 512 * 1024
const PLUS_CHUNK_TIMEOUT = 15000
const PLUS_RESOLVE_TIMEOUT = 6000
const PLUS_DATAURL_TIMEOUT = 30000

// 仅自检页展示用的小型类别名表（完整中文名表在正式功能中提供）
const CLASS_NAMES = {
  0: '背景', 1: '墙', 2: '建筑', 3: '天空', 4: '地板', 5: '树', 6: '天花板',
  7: '道路', 8: '床', 9: '窗玻璃', 10: '草地', 11: '橱柜', 12: '人行道',
  13: '人物', 14: '土地', 15: '门', 16: '桌子', 17: '山', 18: '植物',
  19: '窗帘', 20: '椅子', 21: '汽车', 22: '水', 23: '画', 24: '沙发',
  25: '架子', 26: '房屋', 27: '海', 28: '镜子', 29: '地毯', 30: '田野',
  31: '扶手椅', 32: '座位', 33: '栅栏', 34: '书桌', 35: '岩石', 36: '衣柜',
  37: '灯', 38: '浴缸', 39: '栏杆', 40: '坐垫', 41: '底座', 42: '箱子',
  43: '柱子', 44: '招牌', 45: '抽屉柜', 46: '柜台', 47: '沙', 48: '水槽',
  49: '摩天大楼', 50: '壁炉', 51: '冰箱', 52: '看台', 53: '小径',
  54: '楼梯', 55: '跑道', 56: '机箱', 57: '台球桌', 58: '枕头',
  59: '纱门', 60: '楼梯间', 61: '河流', 62: '桥', 63: '书柜', 64: '百叶窗',
  65: '茶几', 66: '马桶', 67: '花', 68: '书', 69: '丘陵', 70: '长椅',
  71: '台面', 72: '炉灶', 73: '棕榈树',
}

export default {
  data() {
    return {
      owner: null,
      canvas: null,
      ctx: null,
      dpr: 1,
      running: false,
      lastToken: -1,
      session: null,
      wasmBytes: null,
      modelBytes: null,
      lastImage: null,
      lastMask: null,
      lastMaskW: 0,
      lastMaskH: 0,
      lastSmall: null,
    }
  },
  mounted() {
    this.ensureCanvas(0)
  },
  methods: {
    // ---------- 与逻辑层通信 ----------
    sendLog(message) {
      const line = '[' + this.nowText() + '] ' + message
      console.log('[ai-test]', message)
      if (this.owner) {
        try {
          this.owner.callMethod('onRenderLog', line)
        } catch (e) {
          console.warn('[ai-test] 日志回传失败', e)
        }
      }
    },
    setState(phase, text) {
      if (this.owner) {
        try {
          this.owner.callMethod('onRenderState', { phase: phase, text: text })
        } catch (e) {}
      }
    },
    sendResult(lines) {
      if (this.owner) {
        try {
          this.owner.callMethod('onRenderResult', { lines: lines })
        } catch (e) {}
      }
    },
    nowText() {
      const d = new Date()
      const p = (n) => (n < 10 ? '0' + n : '' + n)
      return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()) + '.' + String(d.getMilliseconds()).padStart(3, '0')
    },

    // ---------- 画布 ----------
    isDomHost(el) {
      return (
        !!el &&
        typeof el.querySelector === 'function' &&
        typeof el.appendChild === 'function' &&
        typeof el.getBoundingClientRect === 'function'
      )
    },
    resolveHost() {
      const byId = document.getElementById('aiTestStage')
      if (this.isDomHost(byId)) return byId
      if (byId) {
        this.sendLog('画布宿主类型异常: ' + Object.prototype.toString.call(byId) + '，改用选择器')
      }
      const byClass = document.querySelector('.ai-test__stage')
      return this.isDomHost(byClass) ? byClass : null
    },
    ensureCanvas(attempt) {
      const host = this.resolveHost()
      if (!host) {
        if (attempt < 30) {
          setTimeout(() => this.ensureCanvas(attempt + 1), 100)
        } else {
          this.sendLog('画布宿主不可用，跳过预览绘制')
        }
        return
      }
      let canvas = host.querySelector('canvas.ai-test-canvas')
      if (!canvas) {
        canvas = document.createElement('canvas')
        canvas.className = 'ai-test-canvas'
        canvas.style.display = 'block'
        canvas.style.width = '100%'
        canvas.style.height = '100%'
        host.appendChild(canvas)
      }
      const rect = host.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const width = Math.max(1, Math.round(rect.width * dpr))
      const height = Math.max(1, Math.round(rect.height * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      this.canvas = canvas
      this.ctx = canvas.getContext('2d')
      this.dpr = dpr
      this.drawPlaceholder('等待自检…')
    },
    drawPlaceholder(text) {
      if (!this.ctx || !this.canvas) return
      const ctx = this.ctx
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.fillStyle = '#1b1b1f'
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
      ctx.fillStyle = 'rgba(255,255,255,0.45)'
      ctx.font = Math.round(14 * this.dpr) + 'px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(text, this.canvas.width / 2, this.canvas.height / 2)
    },

    // ---------- 入口 ----------
    onPayloadChange(newValue, oldValue, ownerInstance) {
      this.owner = ownerInstance
      try {
        this.ensureCanvas(0)
      } catch (e) {
        this.sendLog('画布初始化异常: ' + (e && e.message ? e.message : e))
      }
      let payload
      try {
        payload = JSON.parse(newValue)
      } catch (e) {
        this.sendLog('自检参数解析失败: ' + e.message)
        return
      }
      // 初始绑定的 token 为 0，尚未开始自检，忽略以避免重复运行
      if (!payload || !payload.token || payload.token <= 0) return
      if (payload.token === this.lastToken) return
      this.lastToken = payload.token
      this.run(payload.image || '')
    },

    async run(imageSrc) {
      if (this.running) {
        this.sendLog('已有自检任务运行中，忽略本次触发')
        return
      }
      this.running = true
      this.setState('running', '检查运行环境…')
      this.sendLog('========== AI 分割自检开始 ==========')
      this.sendLog('页面地址: ' + location.href)
      try {
        this.logEnvironment()
        this.drawPlaceholder('加载 ONNX Runtime…')
        this.setState('running', '加载 ONNX Runtime…')
        await this.loadOrtScript()
        this.sendLog('ORT 全局对象: ' + (window.ort ? '已就绪' : '缺失'))
        this.sendLog('ORT 版本: ' + this.getOrtVersion())
        this.drawPlaceholder('读取模型资源…')
        this.setState('running', '读取 WASM 与模型…')
        await this.loadAssets()
        this.drawPlaceholder('创建推理会话…')
        this.setState('running', '创建推理会话…')
        await this.createSession()
        this.drawPlaceholder('准备测试图片…')
        this.setState('running', '准备测试图片…')
        const source = await this.prepareSourceImage(imageSrc)
        this.drawSource(source)
        this.setState('running', '模型推理中…')
        this.drawPlaceholder('模型推理中…')
        await this.runInference(source)
        this.setState('done', '自检完成')
        this.sendLog('========== 自检通过 ==========')
      } catch (e) {
        const message = e && e.message ? e.message : String(e)
        this.sendLog('自检失败: ' + message)
        if (e && e.stack) this.sendLog('调用栈: ' + String(e.stack).split('\n').slice(0, 4).join(' | '))
        this.setState('error', '自检失败：' + message)
        this.drawPlaceholder('自检失败')
      } finally {
        this.running = false
      }
    },

    logEnvironment() {
      const ua = navigator.userAgent
      this.sendLog('UA: ' + ua)
      this.sendLog('window.plus: ' + (window.plus ? '存在 (App 环境)' : '不存在 (H5/浏览器环境)'))
      this.sendLog('WebAssembly: ' + (typeof WebAssembly !== 'undefined' ? '支持' : '不支持'))
      this.sendLog('SharedArrayBuffer: ' + (typeof SharedArrayBuffer !== 'undefined' ? '支持' : '不支持'))
      this.sendLog('OffscreenCanvas: ' + (typeof OffscreenCanvas !== 'undefined' ? '支持' : '不支持'))
      this.sendLog('Canvas 2D filter: ' + (this.detectFilterSupport() ? '支持' : '不支持'))
      this.sendLog('硬件线程: ' + (navigator.hardwareConcurrency || '未知') + '，DPR: ' + (window.devicePixelRatio || 1))
    },
    detectFilterSupport() {
      try {
        const ctx = document.createElement('canvas').getContext('2d')
        ctx.filter = 'grayscale(1)'
        return ctx.filter === 'grayscale(1)'
      } catch (e) {
        return false
      }
    },
    getOrtVersion() {
      const ort = window.ort
      try {
        if (ort.env && ort.env.versions && ort.env.versions.web) return ort.env.versions.web
      } catch (e) {}
      return '未知'
    },

    // ---------- 加载 ORT ----------
    loadOrtScript() {
      return new Promise((resolve, reject) => {
        if (window.ort && window.ort.InferenceSession) {
          this.sendLog('ORT 已存在，跳过脚本注入')
          resolve()
          return
        }
        const existing = document.querySelector('script[data-ai-ort]')
        if (existing) {
          existing.addEventListener('load', () => resolve())
          existing.addEventListener('error', () => reject(new Error('ORT 脚本加载失败')))
          return
        }
        const script = document.createElement('script')
        script.src = ORT_SCRIPT
        script.async = true
        script.setAttribute('data-ai-ort', '1')
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('ORT 脚本加载失败: ' + script.src))
        document.head.appendChild(script)
        this.sendLog('注入脚本: ' + ORT_SCRIPT)
      })
    },

    // ---------- 资源读取 ----------
    async loadAssets() {
      const wasm = await this.readAsset(WASM_FILE, 'WASM')
      this.wasmBytes = wasm.data
      const model = await this.readAsset(MODEL_FILE, '模型')
      this.modelBytes = model.data
      this.sendLog('WASM 大小: ' + this.formatBytes(wasm.data.byteLength) + '，方式: ' + wasm.method)
      this.sendLog('模型大小: ' + this.formatBytes(model.data.byteLength) + '，方式: ' + model.method)
    },
    async readAsset(path, label) {
      const started = Date.now()
      const errors = []
      if (window.plus && window.plus.io) {
        let lastPct = 0
        try {
          this.sendLog(label + ' 开始分块读取: ' + path)
          const data = await this.readWithPlus(path, (loaded, total) => {
            const pct = Math.floor((loaded / total) * 100)
            if (pct >= lastPct + 25) {
              lastPct = pct
              this.sendLog(label + ' 读取 ' + pct + '%')
            }
          })
          this.sendLog(label + ' 读取成功（plus.io，' + (Date.now() - started) + 'ms）')
          return { data: data, method: 'plus.io' }
        } catch (e) {
          errors.push('plus.io: ' + (e && e.message ? e.message : e))
          this.sendLog(label + ' plus.io 读取失败: ' + (e && e.message ? e.message : e))
        }
      }
      try {
        const data = await this.fetchArrayBuffer(path)
        this.sendLog(label + ' 读取成功（fetch，' + (Date.now() - started) + 'ms）')
        return { data: data, method: 'fetch' }
      } catch (e) {
        errors.push('fetch: ' + (e && e.message ? e.message : e))
        this.sendLog(label + ' fetch 读取失败: ' + (e && e.message ? e.message : e))
      }
      try {
        const data = await this.xhrArrayBuffer(path)
        this.sendLog(label + ' 读取成功（XHR，' + (Date.now() - started) + 'ms）')
        return { data: data, method: 'XHR' }
      } catch (e) {
        errors.push('XHR: ' + (e && e.message ? e.message : e))
        this.sendLog(label + ' XHR 读取失败: ' + (e && e.message ? e.message : e))
      }
      throw new Error(label + ' 全部读取方式失败 -> ' + errors.join(' / '))
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
            this.sendLog('plus.io 路径解析超时: ' + candidate)
            tryNext()
          }, PLUS_RESOLVE_TIMEOUT)
          const onEntryFile = (file) => {
            if (settled) return
            settled = true
            clearTimeout(timer)
            this.sendLog('plus.io 已解析: ' + candidate + '，大小 ' + (Number(file && file.size) || 0) + ' 字节')
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
        return await this.readPlusBlob(file, total)
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
        reader.onloadend = (evt) => {
          const result = evt && evt.target ? evt.target.result : null
          let buffer = null
          if (result instanceof ArrayBuffer) buffer = result
          else if (result && result.buffer instanceof ArrayBuffer) buffer = result.buffer
          if (!buffer) {
            finish(new Error('plus.io 返回类型异常: ' + Object.prototype.toString.call(result)))
            return
          }
          if (expectedSize && buffer.byteLength !== expectedSize) {
            finish(new Error('plus.io 分块长度异常: ' + buffer.byteLength + '/' + expectedSize))
            return
          }
          finish(null, buffer)
        }
        reader.onerror = () => finish(new Error('plus.io FileReader 读取失败'))
        reader.readAsArrayBuffer(blob)
      })
    },
    fetchArrayBuffer(path) {
      return fetch(path, { cache: 'no-store' }).then((resp) => {
        if (!resp.ok) throw new Error('HTTP ' + resp.status)
        return resp.arrayBuffer()
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
            else reject(new Error('XHR 返回不是 ArrayBuffer'))
          } else {
            reject(new Error('HTTP ' + xhr.status))
          }
        }
        xhr.onerror = () => reject(new Error('XHR 网络错误'))
        xhr.send()
      })
    },
    formatBytes(bytes) {
      if (!bytes && bytes !== 0) return '未知'
      if (bytes < 1024) return bytes + ' B'
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
      return (bytes / 1024 / 1024).toFixed(2) + ' MB'
    },

    // ---------- 会话 ----------
    async createSession() {
      const ort = window.ort
      if (!ort) throw new Error('ORT 未加载')
      const env = ort.env
      env.wasm.numThreads = 1
      env.wasm.proxy = false
      env.wasm.wasmBinary = new Uint8Array(this.wasmBytes)
      if (!env.versions) env.versions = {}
      const started = Date.now()
      this.sendLog('开始创建 InferenceSession（wasm / 单线程）…')
      let session
      try {
        session = await ort.InferenceSession.create(new Uint8Array(this.modelBytes), {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all',
        })
      } catch (e) {
        const firstError = e && e.message ? e.message : String(e)
        this.sendLog('wasmBinary 方式创建失败: ' + firstError)
        this.sendLog('尝试 wasmPaths 方式…')
        env.wasm.wasmBinary = undefined
        env.wasm.wasmPaths = ASSET_BASE
        session = await ort.InferenceSession.create(new Uint8Array(this.modelBytes), {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all',
        })
      }
      this.session = session
      this.sendLog('会话创建成功（' + (Date.now() - started) + 'ms）')
      this.sendLog('输入: ' + session.inputNames.join(', ') + ' / 输出: ' + session.outputNames.join(', '))
      try {
        this.sendLog('元数据: ' + JSON.stringify(session.inputMetadata))
      } catch (e) {}
    },

    // ---------- 图片与前处理 ----------
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
    async prepareSourceImage(imageSrc) {
      if (imageSrc) {
        this.sendLog('读取所选图片: ' + imageSrc)
        const started = Date.now()
        let img = null
        let revokeUrl = ''
        if (!/^(data:|blob:|https?:)/.test(imageSrc) && window.plus && window.plus.io) {
          try {
            img = await this.loadImage(await this.readWithDataURL(imageSrc))
            this.sendLog('图片经 plus.io DataURL 读取成功（' + (Date.now() - started) + 'ms）')
          } catch (e) {
            this.sendLog('图片 DataURL 读取失败，尝试分块读取: ' + (e && e.message ? e.message : e))
          }
          if (!img) {
            try {
              const bytes = await this.readWithPlus(imageSrc)
              const type = this.sniffImageType(bytes)
              revokeUrl = URL.createObjectURL(new Blob([bytes], { type: type }))
              img = await this.loadImage(revokeUrl)
              this.sendLog(
                '图片经 plus.io 分块读取成功（' +
                  (Date.now() - started) +
                  'ms，' +
                  this.formatBytes(bytes.byteLength) +
                  '）',
              )
            } catch (e) {
              this.sendLog('图片 plus.io 分块读取失败，尝试本地 URL: ' + (e && e.message ? e.message : e))
            }
          }
          if (!img) {
            const candidates = this.localImageCandidates(imageSrc)
            for (let i = 0; i < candidates.length; i++) {
              try {
                img = await this.loadImage(candidates[i])
                this.sendLog('图片经本地 URL 读取成功: ' + candidates[i])
                break
              } catch (e) {
                this.sendLog('本地 URL 失败: ' + candidates[i] + ' -> ' + (e && e.message ? e.message : e))
              }
            }
          }
        }
        if (!img) {
          try {
            img = await this.loadImage(imageSrc)
          } finally {
            if (revokeUrl) URL.revokeObjectURL(revokeUrl)
          }
        } else if (revokeUrl) {
          URL.revokeObjectURL(revokeUrl)
        }
        this.sendLog('图片尺寸: ' + img.naturalWidth + ' × ' + img.naturalHeight)
        const source = this.imageToImageData(img, MAX_SIDE)
        this.sendLog('送入分割尺寸: ' + source.width + ' × ' + source.height)
        return source
      }
      this.sendLog('未选择图片，使用内置合成图测试')
      return this.makeTestImage()
    },
    loadImage(src) {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('图片加载失败: ' + String(src).slice(0, 120)))
        img.src = src
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
    imageToImageData(img, maxSide) {
      const w = img.naturalWidth || img.width
      const h = img.naturalHeight || img.height
      const scale = Math.min(1, maxSide / Math.max(w, h))
      const dw = Math.max(1, Math.round(w * scale))
      const dh = Math.max(1, Math.round(h * scale))
      const canvas = document.createElement('canvas')
      canvas.width = dw
      canvas.height = dh
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, dw, dh)
      return ctx.getImageData(0, 0, dw, dh)
    },
    makeTestImage() {
      const width = 640
      const height = 480
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      const sky = ctx.createLinearGradient(0, 0, 0, height * 0.55)
      sky.addColorStop(0, '#5aa7e8')
      sky.addColorStop(1, '#cfe8f7')
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, width, height * 0.55)
      ctx.fillStyle = '#79b356'
      ctx.fillRect(0, height * 0.55, width, height * 0.45)
      ctx.fillStyle = '#d9c9a3'
      ctx.fillRect(width * 0.18, height * 0.32, width * 0.34, height * 0.34)
      ctx.fillStyle = '#b44f42'
      ctx.beginPath()
      ctx.moveTo(width * 0.15, height * 0.32)
      ctx.lineTo(width * 0.35, height * 0.16)
      ctx.lineTo(width * 0.55, height * 0.32)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#f4e2a1'
      ctx.fillRect(width * 0.27, height * 0.42, width * 0.08, height * 0.1)
      ctx.fillStyle = '#6b4f2a'
      ctx.fillRect(width * 0.4, height * 0.48, width * 0.06, height * 0.18)
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(width * 0.8, height * 0.18, width * 0.06, 0, Math.PI * 2)
      ctx.fill()
      this.sendLog('合成测试图: 天空 / 建筑 / 草地 / 太阳')
      return ctx.getImageData(0, 0, width, height)
    },

    // ---------- 推理 ----------
    async runInference(source) {
      const ort = window.ort
      const session = this.session
      if (!session) throw new Error('会话不存在')
      const t0 = Date.now()
      const input = this.preprocess(source)
      const t1 = Date.now()
      this.sendLog('前处理完成（' + (t1 - t0) + 'ms），开始推理…')
      const inputName = session.inputNames[0]
      const outputName = session.outputNames[0]
      const results = await session.run({ [inputName]: input })
      const t2 = Date.now()
      const output = results[outputName]
      if (!output) throw new Error('未拿到输出张量: ' + outputName)
      this.sendLog('推理完成（' + (t2 - t1) + 'ms），输出 dims: ' + JSON.stringify(output.dims) + '，类型: ' + output.type)
      const dims = output.dims
      if (dims.length !== 4) throw new Error('输出维度异常: ' + JSON.stringify(dims))
      const numClasses = dims[1]
      const outH = dims[2]
      const outW = dims[3]
      const logits = output.data
      if (!(logits instanceof Float32Array)) {
        throw new Error('输出数据不是 Float32Array，而是 ' + Object.prototype.toString.call(logits))
      }
      const t3 = Date.now()
      const small = this.argmaxNCHW(logits, outW, outH, numClasses)
      for (let i = 0; i < small.length; i++) small[i] += 1
      this.sendLog('小图 argmax 完成（' + (Date.now() - t3) + 'ms）')
      const t4 = Date.now()
      const mask = this.bilinearRefineNCHW(logits, small, outW, outH, source.width, source.height)
      this.sendLog('双线性细化完成（' + (Date.now() - t4) + 'ms）')
      const t5 = Date.now()
      const finalMask = this.majorityFilter(mask, source.width, source.height)
      this.sendLog('多数滤波完成（' + (Date.now() - t5) + 'ms）')
      this.lastImage = source
      this.lastMask = finalMask
      this.lastMaskW = source.width
      this.lastMaskH = source.height
      this.lastSmall = small
      const regions = this.collectRegions(finalMask)
      this.sendLog('识别区域数（含背景）: ' + regions.length)
      const top = regions.slice(0, 8)
      top.forEach((item) => {
        this.sendLog('  #' + item.id + ' ' + this.className(item.id) + '：' + item.count + ' px (' + (item.ratio * 100).toFixed(1) + '%)')
      })
      this.drawResult(source, finalMask)
      const lines = [
        '模型输出: ' + JSON.stringify(dims),
        '会话输入: ' + inputName + ' / 输出: ' + outputName,
        '推理耗时: ' + (t2 - t1) + ' ms',
        '前处理: ' + (t1 - t0) + ' ms',
        '后处理: ' + (Date.now() - t3) + ' ms',
        '区域数量: ' + regions.filter((item) => item.id > 0).length,
        'Top: ' + top.slice(0, 5).map((item) => this.className(item.id) + '(' + (item.ratio * 100).toFixed(0) + '%)').join('，'),
      ]
      this.sendResult(lines)
    },
    preprocess(image) {
      const size = INPUT_SIZE
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
      const ort = window.ort
      return new ort.Tensor('float32', data, [1, 3, size, size])
    },

    // ---------- 后处理（从参考代码1迁移） ----------
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
          const c3 = smallMask[p11] === c0 || smallMask[p11] === c1 || smallMask[p11] === c2 ? -1 : smallMask[p11]
          let best = 0
          let bestScore = -Infinity
          const cands = [c0, c1, c2, c3]
          for (let k = 0; k < 4; k++) {
            const cls = cands[k]
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
      const vals = new Uint8Array(9)
      for (let y = 0; y < height; y++) {
        const y0 = Math.max(0, y - 1)
        const y1 = Math.min(height - 1, y + 1)
        for (let x = 0; x < width; x++) {
          const x0 = Math.max(0, x - 1)
          const x1 = Math.min(width - 1, x + 1)
          let n = 0
          for (let yy = y0; yy <= y1; yy++) {
            for (let xx = x0; xx <= x1; xx++) {
              vals[n++] = mask[yy * width + xx]
            }
          }
          let best = vals[0]
          let bestN = 0
          for (let i = 0; i < n; i++) {
            let cnt = 0
            for (let j = 0; j < n; j++) {
              if (vals[j] === vals[i]) cnt++
            }
            if (cnt > bestN) {
              bestN = cnt
              best = vals[i]
            }
          }
          out[y * width + x] = best
        }
      }
      return out
    },
    collectRegions(mask) {
      const counts = new Uint32Array(256)
      for (let i = 0; i < mask.length; i++) counts[mask[i]]++
      const total = mask.length
      const list = []
      for (let id = 0; id < 256; id++) {
        if (counts[id] > 0) list.push({ id: id, count: counts[id], ratio: counts[id] / total })
      }
      list.sort((a, b) => (a.id === 0 ? 1 : b.id === 0 ? -1 : b.count - a.count))
      return list
    },
    className(id) {
      return CLASS_NAMES[id] || ('类别 ' + id)
    },
    classColor(id) {
      if (id === 0) return [24, 24, 28]
      const hue = (id * 137.508) % 360
      return this.hslToRgb(hue / 360, 0.62, 0.55)
    },
    hslToRgb(h, s, l) {
      let r, g, b
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
      return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
    },

    // ---------- 绘制 ----------
    drawSource(image) {
      if (!this.ctx) return
      const src = document.createElement('canvas')
      src.width = image.width
      src.height = image.height
      src.getContext('2d').putImageData(image, 0, 0)
      const ctx = this.ctx
      const cw = this.canvas.width
      const ch = this.canvas.height
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.fillStyle = '#121214'
      ctx.fillRect(0, 0, cw, ch)
      const scale = Math.min(cw / image.width, ch / image.height)
      const dw = image.width * scale
      const dh = image.height * scale
      const dx = (cw - dw) / 2
      const dy = (ch - dh) / 2
      ctx.drawImage(src, dx, dy, dw, dh)
    },
    drawResult(image, mask) {
      if (!this.ctx) return
      const overlay = document.createElement('canvas')
      overlay.width = image.width
      overlay.height = image.height
      const octx = overlay.getContext('2d')
      const overlayData = octx.createImageData(image.width, image.height)
      const od = overlayData.data
      const colorCache = {}
      for (let i = 0; i < mask.length; i++) {
        const id = mask[i]
        let color = colorCache[id]
        if (!color) {
          color = this.classColor(id)
          colorCache[id] = color
        }
        const j = i * 4
        od[j] = color[0]
        od[j + 1] = color[1]
        od[j + 2] = color[2]
        od[j + 3] = id === 0 ? 0 : 150
      }
      octx.putImageData(overlayData, 0, 0)
      const ctx = this.ctx
      const cw = this.canvas.width
      const ch = this.canvas.height
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.fillStyle = '#121214'
      ctx.fillRect(0, 0, cw, ch)
      const scale = Math.min(cw / image.width, ch / image.height)
      const dw = image.width * scale
      const dh = image.height * scale
      const dx = (cw - dw) / 2
      const dy = (ch - dh) / 2
      const src = document.createElement('canvas')
      src.width = image.width
      src.height = image.height
      src.getContext('2d').putImageData(image, 0, 0)
      ctx.drawImage(src, dx, dy, dw, dh)
      ctx.drawImage(overlay, dx, dy, dw, dh)
      // 标注面积最大的 5 个非背景区域
      const regions = this.collectRegions(mask).filter((item) => item.id > 0).slice(0, 5)
      ctx.font = Math.round(11 * this.dpr) + 'px sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      regions.forEach((region, index) => {
        const point = this.regionCenter(mask, image.width, image.height, region.id)
        if (!point) return
        const x = dx + point.x * scale
        const y = dy + point.y * scale
        const label = this.className(region.id)
        const textWidth = ctx.measureText(label).width
        ctx.fillStyle = 'rgba(0,0,0,0.62)'
        ctx.fillRect(x, y - 9 * this.dpr, textWidth + 10 * this.dpr, 18 * this.dpr)
        ctx.fillStyle = '#ffffff'
        ctx.fillText(label, x + 5 * this.dpr, y)
      })
    },
    regionCenter(mask, width, height, id) {
      let minX = width
      let minY = height
      let maxX = -1
      let maxY = -1
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (mask[y * width + x] === id) {
            if (x < minX) minX = x
            if (x > maxX) maxX = x
            if (y < minY) minY = y
            if (y > maxY) maxY = y
          }
        }
      }
      if (maxX < 0) return null
      return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }
    },
  },
}
</script>

<style lang="scss" scoped>
.ai-test {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  padding: 16px 16px 0;
  box-sizing: border-box;
  background: #121214;
  color: #f5f5f7;
}

.ai-test__head {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  gap: 4px;
  margin-bottom: 12px;
}

.ai-test__title {
  font-size: 20px;
  font-weight: 700;
  color: #ffffff;
}

.ai-test__sub {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.ai-test__actions {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
  margin-bottom: 10px;
}

.ai-test__btn {
  flex: 1;
  height: 36px;
  margin: 0;
  padding: 0 10px;
  border-radius: 10px;
  background: #26262b;
  color: #ffffff;
  font-size: 13px;
  line-height: 36px;
  text-align: center;

  &::after {
    border: none;
  }

  &[disabled] {
    opacity: 0.55;
  }
}

.ai-test__btn--primary {
  background: #ff5a3c;
}

.ai-test__stage {
  position: relative;
  flex-shrink: 0;
  width: 100%;
  height: 300px;
  overflow: hidden;
  border-radius: 14px;
  background: #1b1b1f;
}

.ai-test__status {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 8px;
  min-height: 36px;
  padding: 6px 2px;
  font-size: 12px;
}

.ai-test__status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #8a8a92;
}

.is-running .ai-test__status-dot {
  background: #ffb020;
  animation: ai-test-pulse 1s ease-in-out infinite;
}

.is-done .ai-test__status-dot {
  background: #34c759;
}

.is-error .ai-test__status-dot {
  background: #ff3b30;
}

.ai-test__status-text {
  flex: 1;
  min-width: 0;
  color: rgba(255, 255, 255, 0.78);
}

.ai-test__image-name {
  max-width: 140px;
  overflow: hidden;
  color: rgba(255, 255, 255, 0.38);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-test__summary {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  gap: 3px;
  margin-bottom: 8px;
  padding: 10px 12px;
  border: 1px solid rgba(52, 199, 89, 0.25);
  border-radius: 10px;
  background: rgba(52, 199, 89, 0.08);
}

.ai-test__summary-line {
  color: rgba(255, 255, 255, 0.78);
  font-size: 11px;
  line-height: 16px;
}

.ai-test__log {
  flex: 1;
  min-height: 0;
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #1b1b1f;
  box-sizing: border-box;
}

.ai-test__line {
  display: block;
  color: rgba(255, 255, 255, 0.72);
  font-family: Menlo, Consolas, monospace;
  font-size: 10px;
  line-height: 16px;
  word-break: break-all;
}

.ai-test__line--muted {
  color: rgba(255, 255, 255, 0.35);
}

@keyframes ai-test-pulse {
  0%,
  100% {
    opacity: 0.45;
  }
  50% {
    opacity: 1;
  }
}
</style>
