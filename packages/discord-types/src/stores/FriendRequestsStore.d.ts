import { RelationshipType } from "../../enums";
import { FluxStore } from "..";

export interface FriendRequest {
    /** userId, or `${userId}-${applicationId}` for game relationships */
    key: string;
    userId: string;
    type: RelationshipType.INCOMING_REQUEST | RelationshipType.OUTGOING_REQUEST;
    since: string;
    applicationId: string | undefined;
    isGameRelationship: boolean;
}

export class FriendRequestsStore extends FluxStore {
    getIncomingRequests(): FriendRequest[];
    getOutgoingRequests(): FriendRequest[];
}
