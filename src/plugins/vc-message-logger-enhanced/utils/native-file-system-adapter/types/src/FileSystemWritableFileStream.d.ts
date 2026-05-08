/* eslint-disable */
export default FileSystemWritableFileStream;
export class FileSystemWritableFileStream extends WritableStream<any> {
    constructor(...args: any[]);
    private _closed;
    seek(position: number): Promise<void>;
    truncate(size: number): Promise<void>;
    write(data: any): Promise<void>;
}
