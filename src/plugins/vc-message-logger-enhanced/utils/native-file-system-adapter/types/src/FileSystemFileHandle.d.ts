/* eslint-disable */
export default FileSystemFileHandle;
export class FileSystemFileHandle extends FileSystemHandle {
    constructor(adapter: any);
    createWritable(options?: {
        keepExistingData?: boolean;
    }): Promise<FileSystemWritableFileStream>;
    getFile(): Promise<File>;
    [kAdapter]: any;
}
import FileSystemHandle from "./FileSystemHandle.js";
import FileSystemWritableFileStream from "./FileSystemWritableFileStream.js";
declare const kAdapter: unique symbol;
