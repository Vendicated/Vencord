import { Activity, FluxStore, OnlineStatus } from "..";

export interface LocalPresence {
    status: OnlineStatus;
    since: number;
    activities: Activity[];
    afk: boolean;
}

export class SelfPresenceStore extends FluxStore {
    findActivity(predicate: (activity: Activity) => boolean, filtered?: boolean): Activity | undefined;
    getActivities(filtered?: boolean): Activity[];
    getApplicationActivity(applicationId: string, filtered?: boolean): Activity | undefined;
    getHiddenActivities(): Activity[];
    getLocalPresence(): LocalPresence;
    getPrimaryActivity(filtered?: boolean): Activity | undefined;
    getStatus(): OnlineStatus;
    getUnfilteredActivities(filtered?: boolean): Activity[];
}
