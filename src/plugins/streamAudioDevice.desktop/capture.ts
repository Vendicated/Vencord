/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** Owns only the tracks created for a screen share, never the voice-chat input. */
export class StreamAudioCapture {
    private generation = 0;
    private sessions = new Set<() => void>();

    constructor(private readonly reportError: (message: string) => void) { }

    async capture(
        display: Promise<MediaStream>,
        deviceId: string,
        getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>
    ): Promise<MediaStream> {
        const { generation } = this;
        const screen = await display;
        let input: MediaStream | undefined;
        try {
            if (generation !== this.generation) throw new Error("Stream Audio was disabled during capture.");
            const video = screen.getVideoTracks()[0];
            if (!video || video.readyState === "ended") throw new Error("Screen sharing has already ended.");

            // Stop loopback before opening the input. Never retain it as a fallback.
            for (const track of screen.getAudioTracks()) {
                screen.removeTrack(track);
                track.stop();
            }
            input = await getUserMedia({
                video: false,
                audio: {
                    deviceId: { exact: deviceId },
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });
            const audio = input.getAudioTracks()[0];
            if (generation !== this.generation || screen.getVideoTracks()[0]?.readyState === "ended")
                throw new Error("Screen sharing ended while opening the audio input.");
            if (!audio || audio.readyState === "ended") throw new Error("The selected audio input did not provide audio.");

            screen.addTrack(audio);
            let closed = false;
            const stopVideo = video.stop;
            const stopAudio = audio.stop;
            const cleanup = () => {
                if (closed) return;
                closed = true;
                video.removeEventListener("ended", cleanup);
                audio.removeEventListener("ended", inputEnded);
                screen.removeEventListener("inactive", cleanup);
                if (video.stop === stopVideoAndAudio) video.stop = stopVideo;
                if (audio.stop === stopVideoAndAudio) audio.stop = stopAudio;
                this.sessions.delete(cleanup);
                screen.getTracks().forEach(track => track.stop());
                input!.getTracks().forEach(track => track.stop());
            };
            const inputEnded = () => {
                cleanup();
                this.reportError("Stream Audio input disconnected. Restart sharing after selecting an available input.");
            };
            // MediaStreamTrack.stop() does not dispatch 'ended'. Handle Discord's
            // explicit stop as well as the browser's own stop-sharing control.
            const stopVideoAndAudio = () => cleanup();
            video.stop = stopVideoAndAudio;
            audio.stop = stopVideoAndAudio;
            video.addEventListener("ended", cleanup);
            audio.addEventListener("ended", inputEnded);
            screen.addEventListener("inactive", cleanup);
            this.sessions.add(cleanup);
            return screen;
        } catch (error) {
            screen.getTracks().forEach(track => track.stop());
            input?.getTracks().forEach(track => track.stop());
            this.reportError("Could not start Stream Audio. Check the selected input and microphone permission; system audio was not used.");
            throw error;
        }
    }

    stop() {
        this.generation++;
        for (const cleanup of [...this.sessions]) cleanup();
    }
}
