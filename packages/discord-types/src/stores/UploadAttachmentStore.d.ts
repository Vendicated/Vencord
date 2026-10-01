import { CloudUpload, FluxStore } from "..";
import { DraftType } from "../../enums";

export class UploadAttachmentStore extends FluxStore {
    getFirstUpload(channelId: string, draftType: DraftType): CloudUpload | null;
    hasAdditionalUploads(channelId: string, draftType: DraftType): boolean;
    getUploads(channelId: string, draftType: DraftType): CloudUpload[];
    getUploadCount(channelId: string, draftType: DraftType): number;
    getUpload(channelId: string, uploadId: string, draftType: DraftType): CloudUpload;
    findUpload(channelId: string, draftType: DraftType, predicate: (upload: CloudUpload) => boolean): CloudUpload | undefined;
}
