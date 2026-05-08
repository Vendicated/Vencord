/* eslint-disable */
export class FileHandle {
    constructor(file: FileEntry, writable?: boolean);
    file: FileEntry;
    kind: string;
    writable: boolean;
    readable: boolean;
    get name(): string;
    isSameEntry(other: {
        file: {
            toURL: () => string;
        };
    }): boolean;
    getFile(): Promise<File>;
    createWritable(opts: any): Promise<Sink>;
}
export class FolderHandle {
    constructor(dir: DirectoryEntry, writable?: boolean);
    dir: FileSystemDirectoryEntry;
    writable: boolean;
    readable: boolean;
    kind: string;
    name: string;
    isSameEntry(other: FolderHandle): boolean;
    entries(): AsyncGenerator<[string, FileHandle | FolderHandle]>;
    getDirectoryHandle(name: string, opts: {
        create: boolean;
    }): Promise<FolderHandle>;
    getFileHandle(name: string, opts: {
        create: boolean;
    }): Promise<FileHandle>;
    removeEntry(name: string, opts: {
        recursive: boolean;
    }): Promise<any>;
}
declare function _default(opts?: {}): Promise<any>;
export default _default;
declare class Sink {
    constructor(writer: FileWriter, fileEntry: FileEntry);
    writer: FileWriter;
    fileEntry: FileEntry;
    write(chunk: BlobPart | any): Promise<any>;
    close(): Promise<any>;
}
