/* eslint-disable */
/** @typedef {import('./FileSystemDirectoryHandle.js').default} FileSystemDirectoryHandle */

const native = globalThis.showDirectoryPicker

/**
 * @param {Object} [options]
 * @param {boolean} [options._preferPolyfill] If you rather want to use the polyfill instead of the native
 * @returns {Promise<FileSystemDirectoryHandle>}
 */
async function showDirectoryPicker (options = {}) {
  if (native && !options._preferPolyfill) {
    return native(options)
  }

  const input = document.createElement('input')
  input.type = 'file'
  input.webkitdirectory = true
  // Fallback to multiple files input for iOS Safari
  input.multiple = true

  // See https://stackoverflow.com/questions/47664777/javascript-file-input-onchange-not-working-ios-safari-only
  input.style.position = 'fixed'
  input.style.top = '-100000px'
  input.style.left = '-100000px'
  document.body.appendChild(input)

  // Lazy load while the user is choosing the directory
  const p = import('./util.js')

  await new Promise(resolve => {
    input.addEventListener('change', resolve)
    input.click()
  })

  return p.then(mod => mod.getDirHandlesFromInput(input))
}

export default showDirectoryPicker
export { showDirectoryPicker }
