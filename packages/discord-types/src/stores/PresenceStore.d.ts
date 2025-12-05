import { Activity, OnlineStatus } from "../common";
import { FluxStore } from "./FluxStore";

export interface UserAndActivity {
    userId: string;
    activity: Activity;
}

export type DiscordPlatform = "desktop" | "mobile" | "web" | "embedded";

export class PresenceStore extends FluxStore {
    findActivity(userId: string, predicate: (activity: Activity) => boolean, guildId?: string): Activity | undefined;
    getActivities(userId: string, guildId?: string): Activity[];
    getActivityMetadata(userId: string): any;
    getAllApplicationActivities(applicationId: string): UserAndActivity[];
    getApplicationActivity(userId: string, applicationId: string, guildId?: string): Activity | null;
    getClientStatus(userId: string): Record<DiscordPlatform, OnlineStatus>;
    getHiddenActivities(): any;
    /** literally just getActivities(...)[0] */
    getPrimaryActivity(userId: string, guildId?: string): Activity | null;
    getState(): any;
    getStatus(userId: string, guildId?: string | null, defaultStatus?: OnlineStatus): OnlineStatus;
    getUnfilteredActivities(userId: string, guildId?: string): Activity[];
    getUserIds(): string[];
    isMobileOnline(userId: string): boolean;
}
