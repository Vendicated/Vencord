import { Activity, OnlineStatus } from "../common";
import { FluxStore } from "./FluxStore";

export interface UserAndActivity {
    userId: string;
    activity: Activity;
}

export type DiscordPlatform = "desktop" | "mobile" | "web" | "embedded";

export interface PresenceStoreState {
    presencesForGuilds: Record<string, Record<string, { status: OnlineStatus; activities: Activity[]; clientStatus: Partial<Record<DiscordPlatform, OnlineStatus>>; }>>;
    statuses: Record<string, OnlineStatus>;
    activities: Record<string, Activity[]>;
    filteredActivities: Record<string, Activity[]>;
    hiddenActivities: Record<string, Activity[]>;
    // TODO: finish typing
    activityMetadata: Record<string, any>;
    clientStatuses: Record<string, Partial<Record<DiscordPlatform, OnlineStatus>>>;
}

export class PresenceStore extends FluxStore {
    findActivity(userId: string, predicate: (activity: Activity) => boolean, guildId?: string): Activity | undefined;
    getActivities(userId: string, guildId?: string): Activity[];
    // TODO: finish typing
    getActivityMetadata(userId: string): any;
    getAllApplicationActivities(applicationId: string): UserAndActivity[];
    getApplicationActivity(userId: string, applicationId: string, guildId?: string): Activity | null;
    getClientStatus(userId: string): Record<DiscordPlatform, OnlineStatus>;
    getHiddenActivities(): Activity[];
    /** literally just getActivities(...)[0] */
    getPrimaryActivity(userId: string, guildId?: string): Activity | null;
    getState(): PresenceStoreState;
    getStatus(userId: string, guildId?: string | null, defaultStatus?: OnlineStatus): OnlineStatus;
    getUnfilteredActivities(userId: string, guildId?: string): Activity[];
    getUserIds(): string[];
    isMobileOnline(userId: string): boolean;
}
