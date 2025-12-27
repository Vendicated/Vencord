import { Channel, FluxStore, Guild, User } from "..";

export interface Invite {
    code: string;
    guild: Guild | null;
    channel: Channel | null;
    inviter: User | null;
    approximate_member_count?: number;
    approximate_presence_count?: number;
    expires_at?: string | null;
    flags?: number;
    target_type?: number;
    target_user?: User;
    // TODO: type these
    target_application?: any;
    stage_instance?: any;
    guild_scheduled_event?: any;
}

export class InviteStore extends FluxStore {
    getInvite(code: string): Invite;
    // TODO: finish typing
    getInviteError(code: string): any | undefined;
    getInvites(): Record<string, Invite>;
    getInviteKeyForGuildId(guildId: string): string | undefined;
    getFriendMemberIds(code: string): string[] | undefined;
}
