/* eslint-disable */
import config from './config.js'

const { WritableStream } = config

class FileSystemWritableFileStream extends WritableStream {
  #writer
  constructor (writer) {
    super(writer)
    this.#writer = writer
    // Stupid Safari hack to extend native classes
    // https://bugs.webkit.org/show_bug.cgi?id=226201
    Object.setPrototypeOf(this, FileSystemWritableFileStream.prototype)

    /** @private */
    this._closed = false
  }

  async close () {
    this._closed = true
    const w = this.getWriter()
    const p = w.close()
    w.releaseLock()
    return p
    // return super.close ? super.close() : this.getWriter().close()
  }

  /** @param {number} position */
  seek (position) {
    return this.write({ type: 'seek', position })
  }

  /** @param {number} size */
  truncate (size) {
    return this.write({ type: 'truncate', size })
  }

  // The write(data) method steps are:
  write (data) {
    if (this._closed) {
      return Promise.reject(new TypeError('Cannot write to a CLOSED writable stream'))
    }

    // 1. Let writer be the result of getting a writer for this.
    const writer = this.getWriter()

    // 2. Let result be the result of writing a chunk to writer given data.
    const result = writer.write(data)

    // 3. Release writer.
    writer.releaseLock()

    // 4. Return result.
    return result
  }
}

Object.defineProperty(FileSystemWritableFileStream.prototype, Symbol.toStringTag, {
  value: 'FileSystemWritableFileStream',
  writable: false,
  enumerable: false,
  configurable: true
})

Object.defineProperties(FileSystemWritableFileStream.prototype, {
  close: { enumerable: true },
  seek: { enumerable: true },
  truncate: { enumerable: true },
  write: { enumerable: true }
})

// Safari safari doesn't support writable streams yet.
if (
  globalThis.FileSystemFileHandle &&
  !globalThis.FileSystemFileHandle.prototype.createWritable &&
  !globalThis.FileSystemWritableFileStream
) {
  globalThis.FileSystemWritableFileStream = FileSystemWritableFileStream
}

export default FileSystemWritableFileStream
export { FileSystemWritableFileStream }
