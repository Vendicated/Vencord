import { FluxStore } from "..";

export interface ApplicationStreamPreviewStore extends FluxStore {
    getIsPreviewLoading: (guildId: string | bigint | null, channelId: string | bigint, ownerId: string | bigint) => boolean;
    getPreviewURL: (guildId: string | bigint | null, channelId: string | bigint, ownerId: string | bigint) => string | undefined;
    getPreviewURLForStreamKey: (streamKey: string) => ReturnType<ApplicationStreamPreviewStore["getPreviewURL"]>;
    shouldFetchPreview: (guildId: string | bigint | null, channelId: string | bigint, ownerId: string | bigint) => boolean;
}
