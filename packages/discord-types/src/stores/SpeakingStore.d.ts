import { FluxStore } from "..";
import { MediaEngineContextType } from "./MediaEngineStore";

export class SpeakingStore extends FluxStore {
    /** ms since the user started speaking, 0 if not speaking */
    getSpeakingDuration(userId: string, now: number, context?: MediaEngineContextType): number;
    getSpeakers(context?: MediaEngineContextType): string[];
    isSpeaking(userId: string, context?: MediaEngineContextType): boolean;
    isPrioritySpeaker(userId: string, context?: MediaEngineContextType): boolean;
    isSoundSharing(userId: string, context?: MediaEngineContextType): boolean;
    isAnyoneElseSpeaking(context?: MediaEngineContextType): boolean;
    isCurrentUserSpeaking(context?: MediaEngineContextType): boolean;
    isCurrentUserPTTActive(): boolean;
    isAnyonePrioritySpeaking(context?: MediaEngineContextType): boolean;
    isCurrentUserPrioritySpeaker(context?: MediaEngineContextType): boolean;
    isCurrentUserPrioritySpeaking(context?: MediaEngineContextType): boolean;
    /** dB, -Infinity when unknown */
    getVoiceVolume(userId: string, context?: MediaEngineContextType): number;
}
