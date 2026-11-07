import { FluxStore } from "..";

export class IdleStore extends FluxStore {
    isIdle(): boolean;
    isAFK(): boolean;
    getIdleSince(): number | null;
    getSystemSuspended(): boolean;
    getSystemLocked(): boolean;
}
