/* eslint-disable */
export default FileSystemHandle;
export class FileSystemHandle {
    constructor(adapter: FileSystemHandle & {
        writable;
    });
    name: string;
    kind: ('file' | 'directory');
    queryPermission({ mode }?: {
        mode?: string;
    }): Promise<any>;
    requestPermission({ mode }?: {
        mode?: string;
    }): Promise<any>;
    remove(options?: {
        recursive?: boolean;
    }): Promise<void>;
    isSameEntry(other: FileSystemHandle): Promise<any>;
    [kAdapter]: any;
}
declare const kAdapter: unique symbol;
