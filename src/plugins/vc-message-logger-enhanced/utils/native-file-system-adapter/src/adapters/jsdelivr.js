/* eslint-disable */
import { errors } from '../util.js'

const { GONE, MISMATCH, SYNTAX, DISALLOWED } = errors

export class FileHandle {
  constructor (entry, root) {
    this.name = entry.name
    this.kind = 'file'
    this._deleted = false
    this._root = root
    this._entry = entry
    this.writable = false
    this.readable = true
  }

  async getFile () {
    const res = await fetch(`https://cdn.jsdelivr.net/${this._root}/${this.name}`)
    const blob = await res.blob()

    return new File([blob], this.name, {
      type: blob.type,
      lastModified: this._entry.time
    })
  }

  async createWritable () {
    throw new DOMException(...DISALLOWED)
  }

  async isSameEntry (other) {
    return this === other
  }
}

function toDic(files, root) {
  const dic = {}
  for (const x of files) {
    x.time = +new Date(x.time)
    if (x.type === 'file') {
      dic[x.name] = new FileHandle(x, root)
    } else {
      dic[x.name] = new FolderHandle(x.files, `${root}/${x.name}`, x.name)
    }
  }
  return dic
}

export class FolderHandle {
  /** @param {string} name */
  constructor (files, root, name = '') {
    this.name = name
    this.kind = 'directory'
    this._deleted = false
    this._entries = toDic(files, root)
    this.writable = false
    this.readable = true
  }

  /** @returns {AsyncGenerator<[string, FileHandle | FolderHandle]>} */
  async * entries () {
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
        throw new DOMException(...DISALLOWED)
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
      throw new DOMException(...DISALLOWED)
    }
  }

  async removeEntry (name, opts) {
    throw new DOMException(...DISALLOWED)
  }
}

export default async root => {
  const res = await fetch(`https://data.jsdelivr.com/v1/package/${root}`)
  const { files } = await res.json()
  return new FolderHandle(files, root)
}
