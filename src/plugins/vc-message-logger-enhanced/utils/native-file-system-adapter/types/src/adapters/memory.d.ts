/* eslint-disable */
export class Sink {
    constructor(fileHandle: FileHandle, file: File);
    fileHandle: FileHandle;
    file: File;
    size: number;
    position: number;
    write(chunk: any): void;
    close(): void;
}
export class FileHandle {
    constructor(name?: string, file?: File, writable?: boolean);
    _file: File;
    name: string;
    kind: string;
    _deleted: boolean;
    writable: boolean;
    readable: boolean;
    getFile(): Promise<File>;
    createWritable(opts: any): Promise<Sink>;
    isSameEntry(other: any): Promise<boolean>;
    _destroy(): Promise<void>;
}
export class FolderHandle {
    constructor(name: string, writable?: boolean);
    name: string;
    kind: string;
    _deleted: boolean;
    _entries: {
        [x: string]: (FolderHandle | FileHandle);
    };
    writable: boolean;
    readable: boolean;
    entries(): AsyncGenerator<[string, FileHandle | FolderHandle]>;
    isSameEntry(other: any): Promise<boolean>;
    getDirectoryHandle(name: string, opts: {
        create: boolean;
    }): Promise<FolderHandle>;
    getFileHandle(name: string, opts: {
        create: boolean;
    }): Promise<FileHandle>;
    removeEntry(name: any, opts: any): Promise<void>;
    _destroy(recursive: any): Promise<void>;
}
declare function _default(): FolderHandle;
export default _default;
