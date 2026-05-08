/* eslint-disable */
export default showOpenFilePicker;
export type FileSystemFileHandle = import('./FileSystemFileHandle.js').default;
export function showOpenFilePicker(options?: {
    multiple?: boolean;
    excludeAcceptAllOption?: boolean;
    accepts?: any[];
    _preferPolyfill?: boolean;
}): Promise<FileSystemFileHandle[]>;
