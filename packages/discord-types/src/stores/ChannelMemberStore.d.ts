import { FluxStore } from "..";

export interface ChannelMemberGroup {
    count: number;
    id: string;
}

export interface ChannelMemberProps {
    listId: string;
    groups: ChannelMemberGroup[];
    rows: unknown[];
    version: number;
}

export class ChannelMemberStore extends FluxStore {
    getProps(guildId?: string, channelId?: string): ChannelMemberProps;
    getRows(guildId?: string, channelId?: string): ChannelMemberProps["rows"];
}
