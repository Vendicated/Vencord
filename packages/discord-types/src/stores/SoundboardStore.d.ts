import { FluxStore } from "..";

export interface SoundboardSound {
    soundId: string;
    name: string;
    volume: number;
    emojiId: string | null;
    emojiName: string | null;
    available: boolean;
    guildId: string;
    userId?: string;
}

export interface TopSoundForGuild {
    soundId: string;
    rank: number;
}

export interface SoundboardOverlayState {
    soundboardSounds: Record<string, SoundboardSound[]>;
    favoritedSoundIds: string[];
    localSoundboardMutes: string[];
}

export class SoundboardStore extends FluxStore {
    getOverlaySerializedState(): SoundboardOverlayState;
    getSounds(): Map<string, SoundboardSound[]>;
    getSoundsForGuild(guildId: string): SoundboardSound[] | null;
    getSound(guildId: string, soundId: string): SoundboardSound;
    getSoundById(soundId: string): SoundboardSound;
    isFetchingSounds(): boolean;
    isFetchingDefaultSounds(): boolean;
    isFetching(): boolean;
    shouldFetchDefaultSounds(): boolean;
    hasFetchedDefaultSounds(): boolean;
    isUserPlayingSounds(userId: string): boolean;
    isPlayingSound(soundId: string): boolean;
    isFavoriteSound(soundId: string): boolean;
    getFavorites(): Set<string>;
    getAllTopSoundsForGuilds(): Map<string, TopSoundForGuild[]>;
    isLocalSoundboardMuted(userId: string): boolean;
    hasHadOtherUserPlaySoundInSession(): boolean;
    shouldFetchTopSoundsForGuilds(): boolean;
    hasFetchedTopSoundsForGuilds(): boolean;
    hasFetchedAllSounds(): boolean;
    isFetchingAnySounds(): boolean;
}
