import { FluxStore } from "..";

export interface SelectedGuildState {
    selectedGuildTimestampMillis: Record<string | number, number>;
    selectedGuildId: string | null;
    lastSelectedGuildId: string | null;
}

export class SelectedGuildStore extends FluxStore {
    getGuildId(): string | null;
    getLastSelectedGuildId(): string | null;
    getLastSelectedTimestamp(guildId: string): number | null;
    getState(): SelectedGuildState | undefined;
}
