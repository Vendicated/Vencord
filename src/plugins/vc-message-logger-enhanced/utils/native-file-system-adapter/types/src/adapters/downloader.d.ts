/* eslint-disable */
export class FileHandle {
    constructor(name?: string);
    name: string;
    kind: string;
    getFile(): Promise<void>;
    isSameEntry(other: any): Promise<boolean>;
    createWritable(options?: object): Promise<WritableStreamDefaultWriter<any>>;
}
