/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 * 
 * Credits: 
 *  - https://github.com/ericc-ch/edge-tts
 *  - https://github.com/SchneeHertz/node-edge-tts
 *  - Claude 3.5 Sonnet
 */

export const CHROMIUM_FULL_VERSION = '130.0.2849.68';
export const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const WINDOWS_FILE_TIME_EPOCH = 11644473600n;

interface Offset {
    Start: number;
    End: number;
}

interface BoundaryEvent {
    offset: Offset;
    text?: string;
    type?: 'word' | 'sentence';
    boundaryType?: string;
}

interface AudioMetadata {
    Metadata: Array<BoundaryEvent>;
    Duration?: number;
    OffsetInBytes?: number;
    BoundaryType?: string;
}

type configure = {
    voice?: string;
    lang?: string;
    outputFormat?: string;
    rate?: string;
    pitch?: string;
    volume?: number;
    timeout?: number;
};

class EdgeTTS {
    private voice: string;
    private lang: string;
    private outputFormat: string;
    private rate: string;
    private pitch: string;
    private volume: number;
    private timeout: number;

    constructor({
        voice = 'en-US-AvaNeural',
        lang = 'en-US',
        outputFormat = 'audio-24khz-96kbitrate-mono-mp3',
        rate = 'default',
        pitch = 'default',
        volume = 20,
        timeout = 10000
    }: configure = {}) {
        this.voice = voice;
        this.lang = lang;
        this.outputFormat = outputFormat;
        this.rate = rate;
        this.pitch = pitch;
        this.volume = volume;
        this.timeout = timeout;
    }

    private async _connectWebSocket(): Promise<WebSocket> {
        const secMsGecToken = await generateSecMsGecToken();
        const url = new URL(
            "/consumer/speech/synthesize/readaloud/edge/v1",
            "wss://speech.platform.bing.com"
        );

        const searchParams = new URLSearchParams({
            TrustedClientToken: TRUSTED_CLIENT_TOKEN,
            'Sec-MS-GEC': secMsGecToken,
            'Sec-MS-GEC-Version': `1-${CHROMIUM_FULL_VERSION}`
        });

        url.search = searchParams.toString();

        return new Promise((resolve, reject) => {
            const ws = new WebSocket(url.toString());

            ws.onopen = () => {
                const configMessage = {
                    context: {
                        synthesis: {
                            audio: {
                                metadataoptions: {
                                    sentenceBoundaryEnabled: "false",
                                    wordBoundaryEnabled: "true"
                                },
                                outputFormat: this.outputFormat
                            }
                        }
                    }
                };

                const message = `Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n${JSON.stringify(configMessage)}`;
                ws.send(message);
                resolve(ws);
            };

            ws.onerror = reject;
        });
    }

    async getVoices(): Promise<Array<{ name: string; shortName: string; }>> {
        const response = await fetch(
            `https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/list?trustedclienttoken=${TRUSTED_CLIENT_TOKEN}`,
            {
                headers: {
                    'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
                }
            }
        );
        const voices = await response.json();
        return voices.map((voice: any) => ({
            name: voice['FriendlyName'],
            shortName: voice['ShortName']
        }));
    }

    async playAudioData(audioData: Uint8Array): Promise<void> {
        const audioContext = new AudioContext();
        const gainNode = audioContext.createGain();

        // Gradually ramp the volume to avoid clicks and pops
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(
            typeof this.volume === 'number' ? this.volume / 20 : 1,
            audioContext.currentTime + 0.01
        );

        gainNode.connect(audioContext.destination);

        try {
            const audioBuffer = await audioContext.decodeAudioData(audioData.buffer);
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(gainNode);
            source.start();

            return new Promise((resolve) => {
                source.onended = () => {
                    // Fade out at the end
                    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.1);
                    // Add a small delay before closing
                    setTimeout(() => {
                        audioContext.close();
                        resolve();
                    }, 200); // 200ms delay
                };
            });
        } catch (error: any) {
            audioContext.close();
            throw new Error(`Failed to play audio: ${error.message}`);
        }
    }

    async speak(text: string): Promise<void> {
        const ws = await this._connectWebSocket();
        const audioChunks: Array<Uint8Array> = [];

        return new Promise((resolve, reject) => {
            let isReceivingData = false;
            const requestId = this._generateRequestId();
            const ssml = `
                <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${this.lang}">
                    <voice name="${this.voice}">
                        <prosody rate="${this.rate}" pitch="${this.pitch}" volume="${this.volume}">
                            ${text}
                        </prosody>
                    </voice>
                </speak>
            `;

            const message = `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n${ssml}`;

            ws.addEventListener("error", reject);
            ws.addEventListener("message", async (event: MessageEvent<string | Blob>) => {
                if (typeof event.data !== "string") {
                    isReceivingData = true;
                    const blob = new Blob([event.data]);
                    const separator = "Path:audio\r\n";
                    const bytes = new Uint8Array(await blob.arrayBuffer());
                    const binaryString = new TextDecoder().decode(bytes);
                    const index = binaryString.indexOf(separator) + separator.length;
                    const audioData = bytes.subarray(index);
                    audioChunks.push(audioData);
                } else if (event.data.includes("Path:turn.end")) {
                    // Wait a bit to ensure all chunks are received
                    setTimeout(async () => {
                        if (isReceivingData) {
                            const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
                            await this.playAudioData(new Uint8Array(await audioBlob.arrayBuffer()));
                            ws.close();
                            resolve();
                        }
                    }, 100);
                }
            });

            ws.send(message);
        });
    }

    private _generateRequestId(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
            const rand = Math.random() * 16 | 0, v = char === 'x' ? rand : (rand & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}

async function sha256Hash(str: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

async function generateSecMsGecToken() {
    const ticks = BigInt(Math.floor((Date.now() / 1000) + Number(WINDOWS_FILE_TIME_EPOCH))) * 10000000n;
    const roundedTicks = ticks - (ticks % 3000000000n);
    const strToHash = `${roundedTicks}${TRUSTED_CLIENT_TOKEN}`;
    return await sha256Hash(strToHash);
}

export { EdgeTTS };