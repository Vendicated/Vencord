/* eslint-disable */
export default showDirectoryPicker;
export type FileSystemDirectoryHandle = import('./FileSystemDirectoryHandle.js').default;
export function showDirectoryPicker(options?: {
    _preferPolyfill?: boolean;
}): Promise<FileSystemDirectoryHandle>;
