/* eslint-disable */
export default FileSystemDirectoryHandle;
export class FileSystemDirectoryHandle extends FileSystemHandle {
    constructor(adapter: any);
    getDirectoryHandle(name: string, options?: {
        create?: boolean;
    }): Promise<FileSystemDirectoryHandle>;
    entries(): AsyncGenerator<[string, FileSystemHandle | FileSystemDirectoryHandle]>;
    getEntries(): AsyncGenerator<import("./FileSystemFileHandle.js").default | FileSystemDirectoryHandle, void, unknown>;
    getFileHandle(name: string, options?: {
        create?: boolean;
    }): Promise<import("./FileSystemFileHandle.js").default>;
    removeEntry(name: string, options?: {
        recursive?: boolean;
    }): Promise<any>;
    resolve(possibleDescendant: any): Promise<any[]>;
    keys(): AsyncGenerator<any, void, unknown>;
    values(): AsyncGenerator<FileSystemHandle | FileSystemDirectoryHandle, void, unknown>;
    [kAdapter]: any;
    [Symbol.asyncIterator](): AsyncGenerator<[string, FileSystemHandle | FileSystemDirectoryHandle], any, any>;
}
import FileSystemHandle from "./FileSystemHandle.js";
declare const kAdapter: unique symbol;
