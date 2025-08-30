export type TTSSource = string;
export type TTSVoice = string;

export type TTSVoiceOption = {
    label: string;
    value: TTSVoice;
};

export type TTSMedia = HTMLAudioElement | SpeechSynthesisUtterance;

export type TTSSourceInterface<T extends TTSMedia> = {
    retrieveVoices(): Promise<TTSVoiceOption[]>;
    getDefaultVoice(): TTSVoice;
    getVoices(): TTSVoiceOption[];
    setVoice(voice: TTSVoice): void;
    getMedia(text: string): Promise<T>;
};
