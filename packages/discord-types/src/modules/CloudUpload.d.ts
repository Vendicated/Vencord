import EventEmitter from "events";
import { CloudUploadPlatform } from "../../enums";

interface BaseUploadItem {
    platform: CloudUploadPlatform;
    id?: string;
    origin?: string;
    isThumbnail?: boolean;
    clip?: unknown;
}

export interface ReactNativeUploadItem extends BaseUploadItem {
    platform: CloudUploadPlatform.REACT_NATIVE;
    uri: string;
    filename?: string;
    mimeType?: string;
    durationSecs?: number;
    waveform?: string;
    isRemix?: boolean;
}

export interface WebUploadItem extends BaseUploadItem {
    platform: CloudUploadPlatform.WEB;
    file: File;
}

export type CloudUploadItem = ReactNativeUploadItem | WebUploadItem;

export class CloudUpload extends EventEmitter {
    constructor(item: CloudUploadItem, channelId: string, showLargeMessageDialog?: boolean, reactNativeFileIndex?: number);

    channelId: string;
    classification: string;
    clip: unknown;
    contentHash: unknown;
    currentSize: number;
    description: string | null;
    durationSecs: number | undefined;
    etag: string | undefined;
    error: unknown;
    filename: string;
    id: string;
    isImage: boolean;
    isRemix: boolean | undefined;
    isThumbnail: boolean;
    isVideo: boolean;
    item: {
        file: File;
        platform: CloudUploadPlatform;
        origin: string;
    };
    loaded: number;
    mimeType: string;
    origin: string;
    postCompressionSize: number | undefined;
    preCompressionSize: number;
    responseUrl: string;
    sensitive: boolean;
    showLargeMessageDialog: boolean;
    spoiler: boolean;
    startTime: number;
    status: "NOT_STARTED" | "STARTED" | "UPLOADING" | "ERROR" | "COMPLETED" | "CANCELLED" | "REMOVED_FROM_MSG_DRAFT";
    uniqueId: string;
    uploadedFilename: string;
    waveform: string | undefined;

    // there are many more methods than just these but I didn't find them particularly useful
    upload(): Promise<void>;
    cancel(): void;
    delete(): Promise<void>;
    getSize(): number;
    maybeConvertToWebP(): Promise<void>;
    removeFromMsgDraft(): void;
}
