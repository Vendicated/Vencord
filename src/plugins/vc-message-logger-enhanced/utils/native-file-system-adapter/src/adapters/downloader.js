/* eslint-disable */
import { errors } from '../util.js'
import config from '../config.js'

const {
  WritableStream,
  TransformStream,
  DOMException,
  Blob
} = config

const { GONE } = errors
// @ts-ignore - Don't match newer versions of Safari, but that's okay
const isOldSafari = /constructor/i.test(window.HTMLElement)

export class FileHandle {
  constructor (name = 'unkown') {
    this.name = name
    this.kind = 'file'
  }

  async getFile () {
    throw new DOMException(...GONE)
  }

  async isSameEntry(other) {
    return this === other
  }

  /**
   * @param {object} [options={}]
   */
  async createWritable (options = {}) {
    const sw = await navigator.serviceWorker?.getRegistration()
    const link = document.createElement('a')
    const ts = new TransformStream()
    const sink = ts.writable

    link.download = this.name

    if (isOldSafari || !sw) {
      /** @type {Blob[]} */
      let chunks = []
      ts.readable.pipeTo(new WritableStream({
        write (chunk) {
          chunks.push(new Blob([chunk]))
        },
        close () {
          const blob = new Blob(chunks, { type: 'application/octet-stream; charset=utf-8' })
          chunks = []
          link.href = URL.createObjectURL(blob)
          link.click()
          setTimeout(() => URL.revokeObjectURL(link.href), 10000)
        }
      }))
    } else {
      const { writable, readablePort } = new RemoteWritableStream(WritableStream)
      // Make filename RFC5987 compatible
      const fileName = encodeURIComponent(this.name).replace(/['()]/g, escape).replace(/\*/g, '%2A')
      const headers = {
        'content-disposition': "attachment; filename*=UTF-8''" + fileName,
        'content-type': 'application/octet-stream; charset=utf-8',
        ...(options.size ? { 'content-length': options.size } : {})
      }

      const keepAlive = setTimeout(() => sw.active.postMessage(0), 10000)

      ts.readable.pipeThrough(new TransformStream({
        transform (chunk, ctrl) {
          if (chunk instanceof Uint8Array) return ctrl.enqueue(chunk)
          const reader = new Response(chunk).body.getReader()
          const pump = _ => reader.read().then(e => e.done ? 0 : pump(ctrl.enqueue(e.value)))
          return pump()
        }
      })).pipeTo(writable).finally(() => {
        clearInterval(keepAlive)
      })

      // Transfer the stream to service worker
      sw.active.postMessage({
        url: sw.scope + fileName,
        headers,
        readablePort
      }, [readablePort])

      // Trigger the download with a hidden iframe
      const iframe = document.createElement('iframe')
      iframe.hidden = true
      iframe.src = sw.scope + fileName
      document.body.appendChild(iframe)
    }

    return sink.getWriter()
  }
}

// Want to remove this postMessage hack, tell them u want transferable streams:
// https://bugs.webkit.org/show_bug.cgi?id=215485

const WRITE = 0
const PULL = 0
const ERROR = 1
const ABORT = 1
const CLOSE = 2

class MessagePortSink {
  /** @param {MessagePort} port */
  constructor (port) {
    port.onmessage = event => this._onMessage(event.data)
    this._port = port
    this._resetReady()
  }

  start (controller) {
    this._controller = controller
    // Apply initial backpressure
    return this._readyPromise
  }

  write (chunk) {
    const message = { type: WRITE, chunk }

    // Send chunk
    this._port.postMessage(message, [chunk.buffer])

    // Assume backpressure after every write, until sender pulls
    this._resetReady()

    // Apply backpressure
    return this._readyPromise
  }

  close () {
    this._port.postMessage({ type: CLOSE })
    this._port.close()
  }

  abort (reason) {
    this._port.postMessage({ type: ABORT, reason })
    this._port.close()
  }

  _onMessage (message) {
    if (message.type === PULL) this._resolveReady()
    if (message.type === ERROR) this._onError(message.reason)
  }

  _onError (reason) {
    this._controller.error(reason)
    this._rejectReady(reason)
    this._port.close()
  }

  _resetReady () {
    this._readyPromise = new Promise((resolve, reject) => {
      this._readyResolve = resolve
      this._readyReject = reject
    })
    this._readyPending = true
  }

  _resolveReady () {
    this._readyResolve()
    this._readyPending = false
  }

  _rejectReady (reason) {
    if (!this._readyPending) this._resetReady()
    this._readyPromise.catch(() => {})
    this._readyReject(reason)
    this._readyPending = false
  }
}

class RemoteWritableStream {
  constructor (WritableStream) {
    const channel = new MessageChannel()
    this.readablePort = channel.port1
    this.writable = new WritableStream(
      new MessagePortSink(channel.port2)
    )
  }
}
