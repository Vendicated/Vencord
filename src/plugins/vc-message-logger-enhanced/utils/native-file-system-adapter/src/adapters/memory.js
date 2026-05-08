/* eslint-disable */
import { errors } from '../util.js'
import config from '../config.js'

const { File, Blob, DOMException } = config
const { INVALID, GONE, MISMATCH, MOD_ERR, SYNTAX, SECURITY, DISALLOWED } = errors

export class Sink {

  /**
   * @param {FileHandle} fileHandle
   * @param {File} file
   */
  constructor (fileHandle, file) {
    this.fileHandle = fileHandle
    this.file = file
    this.size = file.size
    this.position = 0
  }

  write (chunk) {
    let file = this.file

    if (typeof chunk === 'object') {
      if (chunk.type === 'write') {
        if (Number.isInteger(chunk.position) && chunk.position >= 0) {
          this.position = chunk.position
          if (this.size < chunk.position) {
            this.file = new File(
              [this.file, new ArrayBuffer(chunk.position - this.size)],
              this.file.name,
              this.file
            )
          }
        }
        if (!('data' in chunk)) {
          throw new DOMException(...SYNTAX('write requires a data argument'))
        }
        chunk = chunk.data
      } else if (chunk.type === 'seek') {
        if (Number.isInteger(chunk.position) && chunk.position >= 0) {
          if (this.size < chunk.position) {
            throw new DOMException(...INVALID)
          }
          this.position = chunk.position
          return
        } else {
          throw new DOMException(...SYNTAX('seek requires a position argument'))
        }
      } else if (chunk.type === 'truncate') {
        if (Number.isInteger(chunk.size) && chunk.size >= 0) {
          file = chunk.size < this.size
            ? new File([file.slice(0, chunk.size)], file.name, file)
            : new File([file, new Uint8Array(chunk.size - this.size)], file.name)

          this.size = file.size
          if (this.position > file.size) {
            this.position = file.size
          }
          this.file = file
          return
        } else {
          throw new DOMException(...SYNTAX('truncate requires a size argument'))
        }
      }
    }

    chunk = new Blob([chunk])

    let blob = this.file
    // Calc the head and tail fragments
    const head = blob.slice(0, this.position)
    const tail = blob.slice(this.position + chunk.size)

    // Calc the padding
    let padding = this.position - head.size
    if (padding < 0) {
      padding = 0
    }
    blob = new File([
      head,
      new Uint8Array(padding),
      chunk,
      tail
    ], blob.name)

    this.size = blob.size
    this.position += chunk.size

    this.file = blob
  }
  close () {
    if (this.fileHandle._deleted) throw new DOMException(...GONE)
    this.fileHandle._file = this.file
    this.file =
    this.position =
    this.size = null
    if (this.fileHandle.onclose) {
      this.fileHandle.onclose(this.fileHandle)
    }
  }
}

export class FileHandle {
  constructor (name = '', file = new File([], name), writable = true) {
    this._file = file
    this.name = name
    this.kind = 'file'
    this._deleted = false
    this.writable = writable
    this.readable = true
  }

  async getFile () {
    if (this._deleted) throw new DOMException(...GONE)
    return this._file
  }

  async createWritable (opts) {
    if (!this.writable) throw new DOMException(...DISALLOWED)
    if (this._deleted) throw new DOMException(...GONE)

    const file = opts.keepExistingData
      ? await this.getFile()
      : new File([], this.name)

    return new Sink(this, file)
  }

  async isSameEntry (other) {
    return this === other
  }

  async _destroy () {
    this._deleted = true
    this._file = null
  }
}

export class FolderHandle {

  /** @param {string} name */
  constructor (name, writable = true) {
    this.name = name
    this.kind = 'directory'
    this._deleted = false
    /** @type {Object.<string, (FolderHandle|FileHandle)>} */
    this._entries = {}
    this.writable = writable
    this.readable = true
  }

  /** @returns {AsyncGenerator<[string, FileHandle | FolderHandle]>} */
  async * entries () {
    if (this._deleted) throw new DOMException(...GONE)
    yield* Object.entries(this._entries)
  }

  async isSameEntry (other) {
    return this === other
  }

  /**
   * @param {string} name
   * @param {{ create: boolean; }} opts
   */
  async getDirectoryHandle (name, opts) {
    if (this._deleted) throw new DOMException(...GONE)
    const entry = this._entries[name]
    if (entry) { // entry exist
      if (entry instanceof FileHandle) {
        throw new DOMException(...MISMATCH)
      } else {
        return entry
      }
    } else {
      if (opts.create) {
        return (this._entries[name] = new FolderHandle(name))
      } else {
        throw new DOMException(...GONE)
      }
    }
  }

  /**
   * @param {string} name
   * @param {{ create: boolean; }} opts
   */
  async getFileHandle (name, opts) {
    const entry = this._entries[name]
    const isFile = entry instanceof FileHandle
    if (entry && isFile) return entry
    if (entry && !isFile) throw new DOMException(...MISMATCH)
    if (!entry && !opts.create) throw new DOMException(...GONE)
    if (!entry && opts.create) {
      return (this._entries[name] = new FileHandle(name))
    }
  }

  async removeEntry (name, opts) {
    const entry = this._entries[name]
    if (!entry) throw new DOMException(...GONE)
    await entry._destroy(opts.recursive)
    delete this._entries[name]
  }

  async _destroy (recursive) {
    for (let x of Object.values(this._entries)) {
      if (!recursive) throw new DOMException(...MOD_ERR)
      await x._destroy(recursive)
    }
    this._entries = {}
    this._deleted = true
  }
}

const fs = new FolderHandle('')

export default () => fs
