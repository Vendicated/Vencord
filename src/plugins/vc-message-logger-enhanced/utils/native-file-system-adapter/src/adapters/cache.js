/* eslint-disable */
/* global Blob, DOMException, File, Response, caches, location */

import { errors } from '../util.js'

const { INVALID, GONE, MISMATCH, MOD_ERR, SYNTAX } = errors

const DIR = { headers: { 'content-type': 'dir' } }
const FILE = () => ({ headers: { 'content-type': 'file', 'last-modified': Date.now() } })
const hasOwn = Object.prototype.hasOwnProperty

class Sink {
  constructor (cache, path, file) {
    this._cache = cache
    this.path = path
    this.size = file.size
    this.position = 0
    this.file = file
  }

  write (chunk, c) {
    if (typeof chunk === 'object') {
      if (chunk.type === 'write') {
        if (Number.isInteger(chunk.position) && chunk.position >= 0) {
          if (this.size < chunk.position) {
            this.file = new Blob([this.file, new ArrayBuffer(chunk.position - this.size)])
          }
          this.position = chunk.position
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
          let file = this.file
          file = chunk.size < this.size
            ? file.slice(0, chunk.size)
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

  async close () {
    const [r] = await this._cache.keys(this.path)
    if (!r) throw new DOMException(...GONE)
    return this._cache.put(this.path, new Response(this.file, FILE()))
  }
}

export class FileHandle {
  /**
   * @param {string} path
   * @param {Cache} cache
   */
  constructor (path, cache) {
    this._cache = cache
    this.path = path
    this.kind = 'file'
    this.writable = true
    this.readable = true
  }

  get name () {
    return this.path.split('/').pop()
  }

  /** @param {FileHandle} other */
  async isSameEntry (other) {
    return this.path === other.path
  }

  async getFile () {
    const res = await this._cache.match(this.path)
    if (!res) throw new DOMException(...GONE)
    const blob = await res.blob()
    const file = new File([blob], this.name, { lastModified: +res.headers.get('last-modified') })
    return file
  }

  async createWritable (opts) {
    const [r] = await this._cache.keys(this.path)
    if (!r) throw new DOMException(...GONE)

    return new Sink(
      this._cache,
      this.path,
      opts.keepExistingData
        ? await this.getFile()
        : new File([], this.name
      )
    )
  }
}

export class FolderHandle {
  /**
   * @param {string} dir
   * @param {Cache} cache
   */
  constructor (dir, cache) {
    this._dir = dir
    this.writable = true
    this.readable = true
    this._cache = cache
    this.kind = 'directory'
    this.name = dir.split('/').pop()
  }

  /** @returns {AsyncGenerator<[string, FileHandle | FolderHandle]>} */
  async * entries () {
    for (const [path, isFile] of Object.entries(await this._tree)) {
      yield [path.split('/').pop(), isFile ? new FileHandle(path, this._cache) : new FolderHandle(path, this._cache)]
    }
  }

  /** @param {FolderHandle} other  */
  async isSameEntry (other) {
    return this._dir === other._dir
  }

  /**
   * @param {string} name
   * @param {{ create: boolean; }} opts
   */
  async getDirectoryHandle (name, opts) {
    const path = this._dir.endsWith('/') ? this._dir + name : `${this._dir}/${name}`
    const tree = await this._tree
    if (hasOwn.call(tree, path)) {
      const isFile = tree[path]
      if (isFile) throw new DOMException(...MISMATCH)
      return new FolderHandle(path, this._cache)
    } else {
      if (opts.create) {
        tree[path] = false
        await this._cache.put(path, new Response('{}', DIR))
        await this._save(tree)
        return new FolderHandle(path, this._cache)
      }
      throw new DOMException(...GONE)
    }
  }

  get _tree () {
    return this._cache.match(this._dir).then(r => r.json()).catch(e => {
      throw new DOMException(...GONE)
    })
  }

  _save (tree) {
    return this._cache.put(this._dir, new Response(JSON.stringify(tree), DIR))
  }

  /**
   * @param {string} name
   * @param {{ create: boolean; }} opts
   */
  async getFileHandle (name, opts) {
    const path = this._dir.endsWith('/') ? this._dir + name : `${this._dir}/${name}`
    const tree = await this._tree
    if (hasOwn.call(tree, path)) {
      const isFile = tree[path]
      if (!isFile) throw new DOMException(...MISMATCH)
      return new FileHandle(path, this._cache)
    } else {
      if (opts.create) {
        const tree = await this._tree
        tree[path] = true
        await this._cache.put(path, new Response('', FILE()))
        await this._save(tree)
        return new FileHandle(path, this._cache)
      } else {
        throw new DOMException(...GONE)
      }
    }
  }

  /**
   * @param {string} name
   * @param {{ recursive: boolean; }} opts
   */
  async removeEntry (name, opts) {
    const tree = await this._tree
    const path = this._dir.endsWith('/') ? this._dir + name : `${this._dir}/${name}`
    if (hasOwn.call(tree, path)) {
      if (opts.recursive) {
        const toDelete = [...Object.entries(tree)]
        while (toDelete.length) {
          const [path, isFile] = toDelete.pop()
          if (isFile) {
            await this._cache.delete(path)
          } else {
            const e = await this._cache.match(path).then(r => r.json())
            toDelete.push(...Object.entries(e))
          }
        }
        delete tree[path]
      } else {
        const isFile = tree[path]
        delete tree[path]
        if (isFile) {
          await this._cache.delete(path)
        } else {
          const e = await this._cache.match(path).then(r => r.json())
          const keys = Object.keys(e)
          if (keys.length) {
            throw new DOMException(...MOD_ERR)
          } else {
            await this._cache.delete(path)
          }
        }
      }

      await this._save(tree)
    } else {
      throw new DOMException(...GONE)
    }
  }
}

export default async function () {
  const cache = await caches.open('sandboxed-fs')
  if (!await cache.match('/')) await cache.put('/', new Response('{}', DIR))
  return new FolderHandle(location.origin + '/', cache)
}
