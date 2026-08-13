import { FluxStore } from "..";
import { Invite } from "./InviteStore";

export interface FriendInvite extends Invite {
    max_age: number;
    max_uses: number;
    uses: number;
    created_at: string;
    revoked?: boolean;
}

export class InstantInviteStore extends FluxStore {
    getInvite(channelId: string): Invite;
    getFriendInvite(): FriendInvite | null;
    getFriendInvitesFetching(): boolean;
    canRevokeFriendInvite(): boolean;
}
