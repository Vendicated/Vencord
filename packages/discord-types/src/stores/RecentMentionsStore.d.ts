import { FluxStore, Message } from "..";

export class RecentMentionsStore extends FluxStore {
    get hasLoadedEver(): boolean;
    /** timestamp in ms, 0 if never loaded */
    get lastLoaded(): number;
    getMentions(): Message[] | null;
    getSettingsFilteredMentions(): Message[] | null;
    hasMention(messageId: string): true | undefined;
    get loading(): boolean;
    get hasMore(): boolean;
    get guildFilter(): "ALL_SERVERS" | "THIS_SERVER";
    get everyoneFilter(): boolean;
    get roleFilter(): boolean;
    get mentionsAreStale(): boolean;
    /** keyed by channel id */
    get mentionCountByChannel(): Record<string, number>;
    getMentionCountForChannel(channelId: string): number;
}
