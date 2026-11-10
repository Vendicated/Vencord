import { FluxStore } from "..";

export type Soundpack = "classic" | "retro" | "bop" | "ducky" | "lofi" | "asmr" | "discodo" | "halloween" | "winter_holiday";

export interface SoundpackState {
    soundpack: Soundpack;
    lastSoundpackExperimentId: string | null;
}

export class SoundpackStore extends FluxStore {
    getUserAgnosticState(): SoundpackState;
    getSoundpack(): Soundpack;
    getLastSoundpackExperimentId(): string | null;
}
