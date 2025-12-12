import { CloudUpload, DraftType, FluxStore } from "..";

export class UploadAttachmentStore extends FluxStore {
    getFirstUpload(channelId: string, draftType: string): CloudUpload;
    hasAdditionalUploads(channelId: string, draftType: string): boolean;
    getUploads(channelId: string, draftType: DraftType): CloudUpload[];
    getUploadCount(channelId: string, draftType: DraftType): number;
    getUpload(channelId: string, commandName: string, draftType: DraftType): CloudUpload;
    findUpload(channelId: string, draftType: string, predicate: (upload: CloudUpload) => boolean): CloudUpload | undefined;

}
