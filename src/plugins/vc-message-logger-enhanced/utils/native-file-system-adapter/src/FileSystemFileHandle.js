/* eslint-disable */
import FileSystemHandle from './FileSystemHandle.js'
import FileSystemWritableFileStream from './FileSystemWritableFileStream.js'
import './createWritable.js'

const kAdapter = Symbol('adapter')

class FileSystemFileHandle extends FileSystemHandle {
  /** @type {FileSystemFileHandle} */
  [kAdapter]

  constructor (adapter) {
    super(adapter)
    this[kAdapter] = adapter
  }

  /**
   * @param  {Object} [options={}]
   * @param  {boolean} [options.keepExistingData]
   * @returns {Promise<FileSystemWritableFileStream>}
   */
  async createWritable (options = {}) {
    return new FileSystemWritableFileStream(
      await this[kAdapter].createWritable(options)
    )
  }

  /**
   * @returns {Promise<File>}
   */
  async getFile () {
    return this[kAdapter].getFile()
  }
}

Object.defineProperty(FileSystemFileHandle.prototype, Symbol.toStringTag, {
  value: 'FileSystemFileHandle',
  writable: false,
  enumerable: false,
  configurable: true
})

Object.defineProperties(FileSystemFileHandle.prototype, {
  createWritable: { enumerable: true },
  getFile: { enumerable: true }
})

export default FileSystemFileHandle
export { FileSystemFileHandle }
