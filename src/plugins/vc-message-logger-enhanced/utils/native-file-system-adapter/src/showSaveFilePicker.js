/* eslint-disable */
/** @typedef {import('./FileSystemFileHandle.js').default} FileSystemFileHandle */

const native = globalThis.showSaveFilePicker

/**
 * @param {Object} [options]
 * @param {boolean} [options.excludeAcceptAllOption=false] Prevent user for selecting any
 * @param {Object[]} [options.types] Files you want to accept
 * @param {string} [options.suggestedName] the name to fall back to when using polyfill
 * @param {string} [options._name] the name to fall back to when using polyfill
 * @param {boolean} [options._preferPolyfill] If you rather want to use the polyfill instead of the native
 * @return {Promise<FileSystemFileHandle>}
 */
async function showSaveFilePicker (options = {}) {
  if (native && !options._preferPolyfill) {
    return native(options)
  }

  if (options._name) {
    console.warn('deprecated _name, spec now have `suggestedName`')
    options.suggestedName = options._name
  }

  const { FileSystemFileHandle } = await import('./FileSystemFileHandle.js')
  const { FileHandle } = await import('./adapters/downloader.js')
  return new FileSystemFileHandle(new FileHandle(options.suggestedName))
}

export default showSaveFilePicker
export { showSaveFilePicker }
