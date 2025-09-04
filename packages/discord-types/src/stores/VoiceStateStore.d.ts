import { FluxStore } from "./FluxStore";
import { VoiceState } from "../common";

export class VoiceStateStore extends FluxStore {
    getAllVoiceStates(): Record<string, VoiceState>;
    getVoiceStatesForChannel(channelId: string): Record<string, VoiceState>
    getVoiceStateForChannel(channelId: string): VoiceState | undefined
    getVoiceStateForUser(userId: string): VoiceState | undefined
}
