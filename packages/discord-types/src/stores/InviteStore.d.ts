import { Channel, FluxStore, Guild, User } from "..";
import { Application } from "../common/Application";
import { GuildScheduledEvent } from "./GuildScheduledEventStore";
import { GuildScheduledEventPrivacyLevel, InviteTargetType } from "../../enums";

export interface StageInstance {
    id: string;
    guild_id: string;
    channel_id: string;
    topic: string;
    privacy_level: GuildScheduledEventPrivacyLevel;
    discoverable_disabled: boolean;
    guild_scheduled_event_id: string | null;
}

export interface Invite {
    code: string;
    guild: Guild | null;
    channel: Channel | null;
    inviter: User | null;
    approximate_member_count?: number;
    approximate_presence_count?: number;
    expires_at?: string | null;
    flags?: number;
    target_type?: InviteTargetType;
    target_user?: User;
    target_application?: Application;
    stage_instance?: StageInstance;
    guild_scheduled_event?: GuildScheduledEvent;
}

export class InviteStore extends FluxStore {
    getInvite(code: string): Invite;
    // TODO: finish typing
    getInviteError(code: string): any | undefined;
    getInvites(): Record<string, Invite>;
    getInviteKeyForGuildId(guildId: string): string | undefined;
    getFriendMemberIds(code: string): string[] | undefined;
}
