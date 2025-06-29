import { FluxStore } from "..";

export interface SelectedGuildTimings {
    selectedGuildTimestampMillis: Record<string | number, number>;
    selectedGuildId: string | null;
    lastSelectedGuildId: string | null;
}

export class SelectedGuildStore extends FluxStore {
    getGuildId(): string | null;
    getLastSelectedGuildId(): string | null;
    getLastSelectedTimestamp(): string | null;
    getState(): SelectedGuildTimings | undefined;
    initialize(): void;
}
