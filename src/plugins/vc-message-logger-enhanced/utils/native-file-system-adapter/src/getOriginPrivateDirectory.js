/* eslint-disable */
/** @typedef {import('./FileSystemDirectoryHandle.js').default} FileSystemDirectoryHandle */

if (globalThis.DataTransferItem && !DataTransferItem.prototype.getAsFileSystemHandle) {
  DataTransferItem.prototype.getAsFileSystemHandle = async function () {
    const entry = this.webkitGetAsEntry()
    const [
      { FileHandle, FolderHandle },
      { FileSystemDirectoryHandle },
      { FileSystemFileHandle }
    ] = await Promise.all([
      import('./adapters/sandbox.js'),
      import('./FileSystemDirectoryHandle.js'),
      import('./FileSystemFileHandle.js')
    ])

    return entry.isFile
      ? new FileSystemFileHandle(new FileHandle(entry, false))
      : new FileSystemDirectoryHandle(new FolderHandle(entry, false))
  }
}

/**
 * @param {object=} driver
 * @return {Promise<FileSystemDirectoryHandle>}
 */
async function getOriginPrivateDirectory (driver, options = {}) {
  if (!driver) {
    return globalThis.navigator?.storage?.getDirectory() || globalThis.getOriginPrivateDirectory()
  }
  const {FileSystemDirectoryHandle} = await import('./FileSystemDirectoryHandle.js')
  const module = await driver
  const sandbox = await (module.default
    ? module.default(options)
    : module(options)
  )
  return new FileSystemDirectoryHandle(sandbox)
}

export default getOriginPrivateDirectory
