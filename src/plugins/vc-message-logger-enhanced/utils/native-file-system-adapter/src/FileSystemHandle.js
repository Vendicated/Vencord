/* eslint-disable */
const kAdapter = Symbol('adapter')

/**
 * @typedef {Object} FileSystemHandlePermissionDescriptor
 * @property {('read'|'readwrite')} [mode='read']
 */
class FileSystemHandle {
  /** @type {FileSystemHandle} */
  [kAdapter]

  /** @type {string} */
  name
  /** @type {('file'|'directory')} */
  kind

  /** @param {FileSystemHandle & {writable}} adapter */
  constructor (adapter) {
    this.kind = adapter.kind
    this.name = adapter.name
    this[kAdapter] = adapter
  }

  /** @param {FileSystemHandlePermissionDescriptor} descriptor */
  async queryPermission (descriptor = {}) {
    const { mode = 'read' } = descriptor
    const handle = this[kAdapter]

    if (handle.queryPermission) {
      return handle.queryPermission({mode})
    }

    if (mode === 'read') {
      return 'granted'
    } else if (mode === 'readwrite') {
      return handle.writable ? 'granted' : 'denied'
    } else {
      throw new TypeError(`Mode ${mode} must be 'read' or 'readwrite'`)
    }
  }

  async requestPermission ({mode = 'read'} = {}) {
    const handle = this[kAdapter]
    if (handle.requestPermission) {
      return handle.requestPermission({mode})
    }

    if (mode === 'read') {
      return 'granted'
    } else if (mode === 'readwrite') {
      return handle.writable ? 'granted' : 'denied'
    } else {
      throw new TypeError(`Mode ${mode} must be 'read' or 'readwrite'`)
    }
  }

  /**
   * Attempts to remove the entry represented by handle from the underlying file system.
   *
   * @param {object} options
   * @param {boolean} [options.recursive=false]
   */
  async remove (options = {}) {
    await this[kAdapter].remove(options)
  }

  /**
   * @param {FileSystemHandle} other
   */
  async isSameEntry (other) {
    if (this === other) return true
    if (
      (!other) ||
      (typeof other !== 'object') ||
      (this.kind !== other.kind) ||
      (!other[kAdapter])
    ) return false
    return this[kAdapter].isSameEntry(other[kAdapter])
  }
}

Object.defineProperty(FileSystemHandle.prototype, Symbol.toStringTag, {
  value: 'FileSystemHandle',
  writable: false,
  enumerable: false,
  configurable: true
})

// Safari safari doesn't support writable streams yet.
if (globalThis.FileSystemHandle) {
  globalThis.FileSystemHandle.prototype.queryPermission ??= function (descriptor) {
    return 'granted'
  }
}

export default FileSystemHandle
export { FileSystemHandle }
