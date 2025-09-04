export interface VoiceState {
    userId: string
    channelId: string
    sessionId: string | undefined
    mute: boolean
    deaf: boolean
    selfMute: boolean
    selfDeaf: boolean
    selfVideo: boolean
    selfStream: boolean | undefined
    suppress: boolean
    requestToSpeakTimestamp: number | undefined
    discoverable: boolean

    isVoiceMuted(): boolean
    isVoiceDeafened(): boolean
}
