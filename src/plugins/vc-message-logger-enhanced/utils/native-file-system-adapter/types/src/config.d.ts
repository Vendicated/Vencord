/* eslint-disable */
export default config;
declare namespace config {
    const ReadableStream: {
        new <R = any>(underlyingSource?: UnderlyingSource<R>, strategy?: QueuingStrategy<R>): ReadableStream<R>;
        prototype: ReadableStream<any>;
    };
    const WritableStream: {
        new <W = any>(underlyingSink?: UnderlyingSink<W>, strategy?: QueuingStrategy<W>): WritableStream<W>;
        prototype: WritableStream<any>;
    };
    const TransformStream: {
        new <I = any, O = any>(transformer?: Transformer<I, O>, writableStrategy?: QueuingStrategy<I>, readableStrategy?: QueuingStrategy<O>): TransformStream<I, O>;
        prototype: TransformStream<any, any>;
    };
    const DOMException: {
        new (message?: string, name?: string): DOMException;
        prototype: DOMException;
        readonly ABORT_ERR: number;
        readonly DATA_CLONE_ERR: number;
        readonly DOMSTRING_SIZE_ERR: number;
        readonly HIERARCHY_REQUEST_ERR: number;
        readonly INDEX_SIZE_ERR: number;
        readonly INUSE_ATTRIBUTE_ERR: number;
        readonly INVALID_ACCESS_ERR: number;
        readonly INVALID_CHARACTER_ERR: number;
        readonly INVALID_MODIFICATION_ERR: number;
        readonly INVALID_NODE_TYPE_ERR: number;
        readonly INVALID_STATE_ERR: number;
        readonly NAMESPACE_ERR: number;
        readonly NETWORK_ERR: number;
        readonly NOT_FOUND_ERR: number;
        readonly NOT_SUPPORTED_ERR: number;
        readonly NO_DATA_ALLOWED_ERR: number;
        readonly NO_MODIFICATION_ALLOWED_ERR: number;
        readonly QUOTA_EXCEEDED_ERR: number;
        readonly SECURITY_ERR: number;
        readonly SYNTAX_ERR: number;
        readonly TIMEOUT_ERR: number;
        readonly TYPE_MISMATCH_ERR: number;
        readonly URL_MISMATCH_ERR: number;
        readonly VALIDATION_ERR: number;
        readonly WRONG_DOCUMENT_ERR: number;
    };
    const Blob: {
        new (blobParts?: BlobPart[], options?: BlobPropertyBag): Blob;
        prototype: Blob;
    };
    const File: {
        new (fileBits: BlobPart[], fileName: string, options?: FilePropertyBag): File;
        prototype: File;
    };
}
