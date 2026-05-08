/* eslint-disable */
export function fromDataTransfer(entries: any): Promise<import("./FileSystemDirectoryHandle.js").default>;
export function getDirHandlesFromInput(input: any): Promise<import("./FileSystemDirectoryHandle.js").default>;
export function getFileHandlesFromInput(input: any): Promise<import("./FileSystemFileHandle.js").default[]>;
export namespace errors {
    const INVALID: string[];
    const GONE: string[];
    const MISMATCH: string[];
    const MOD_ERR: string[];
    function SYNTAX(m: any): string[];
    const SECURITY: string[];
    const DISALLOWED: string[];
}
export namespace config {
    const writable: {
        new <W = any>(underlyingSink?: UnderlyingSink<W>, strategy?: QueuingStrategy<W>): WritableStream<W>;
        prototype: WritableStream<any>;
    };
}
