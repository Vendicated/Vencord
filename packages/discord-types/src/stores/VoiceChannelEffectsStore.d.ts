import { Emoji, FluxStore, ReactionEmoji } from "..";

export interface VoiceChannelEffect {
    emoji: ReactionEmoji;
    sentAt: number;
    animationType: number;
}

export class VoiceChannelEffectsStore extends FluxStore {
    get recentlyUsedEmojis(): Emoji[];
    get isOnCooldown(): boolean;
    get effectCooldownEndTime(): Date | undefined;
    getEffectForUserId(userId: string): VoiceChannelEffect | undefined;
}
