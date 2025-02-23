/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { closeModal, ModalProps, openModal } from "@utils/modal";
import { useCallback, useEffect, useRef, useState } from "@webpack/common";

export function downloadFile(name: string, data: string): void {
    const file = new File([data], name, { type: "application/json" });
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
}

type AudioKey = string | symbol;
const globalAudio: Record<AudioKey, HTMLAudioElement | null> = {};
const defaultKey = Symbol("default_audio_key");

interface UseAudioOptions {
    source?: string; // audio url
    key?: AudioKey; // specify a different key to allow playback of multiple sounds at once
}

interface PlaySoundOptions {
    volume?: number;
    continuePlayback?: boolean;
}

export function useAudio({ source, key = defaultKey }: UseAudioOptions = {}) {
    const audioRef = useRef<HTMLAudioElement | null>(globalAudio[key] ?? null);
    const [isPlaying, setIsPlaying] = useState<boolean>(
        !!audioRef.current && !audioRef.current.paused && audioRef.current.src === source
    );

    useEffect(() => {
        if (globalAudio[key] && isPlaying) {
            globalAudio[key].addEventListener("pause", () => setIsPlaying(false), { once: true });
        }
    }, [isPlaying]);

    useEffect(() => {
        if (isPlaying && globalAudio[key] && globalAudio[key].src !== source) {
            audioRef.current?.pause();
            playSound();
        }
    }, [key, source, isPlaying]);

    const preloadSound = useCallback(() => {
        if (!source) {
            audioRef.current = null;
            return;
        }

        if (audioRef.current && audioRef.current.src === source)
            return;

        audioRef.current = new Audio(source);
        audioRef.current.preload = "auto";
    }, [source]);

    const playSound = useCallback(
        ({ volume = 1, continuePlayback }: PlaySoundOptions = {}) => {
            preloadSound();

            if (!audioRef.current) {
                delete globalAudio[key];
                return;
            }

            if (globalAudio[key]?.src !== audioRef.current.src || !continuePlayback) {
                globalAudio[key]?.pause();
                globalAudio[key] = audioRef.current;
                globalAudio[key].currentTime = 0;
            }

            globalAudio[key].volume = volume;
            globalAudio[key].play()
                .then(() => setIsPlaying(true))
                .catch(error => {
                    console.error("Error playing audio:", error);
                    setIsPlaying(false);
                });
        },
        [key, preloadSound]
    );

    const stopSound = useCallback(() => globalAudio[key]?.pause(), [key]);

    return { isPlaying, playSound, stopSound, preloadSound };
}

export const cl = classNameFactory();

// Since {...undefined} is the same as {...{}}, we can allow passing undefined when all props are optional
type DefaultProps<T> = T extends { [K in keyof T]: T[K] | undefined } ? T | undefined : T;

interface DefaultModalProps<T extends string> {
    modalProps: ModalProps;
    close: (result?: T) => void;
}

// Modal wrapper which adds an .open method along with a result state
export function modal<TProps = {}, TResult extends string = string>(
    Component: React.FC<TProps & DefaultModalProps<TResult>>
): React.FC<TProps & DefaultModalProps<TResult>> & {
    open: (props?: DefaultProps<TProps>, onClose?: (result: TResult) => void) => void;
} {
    function WrappedModal(props: TProps & DefaultModalProps<TResult>) {
        return <Component {...props} />;
    }

    WrappedModal.open = (props?: DefaultProps<TProps>, onClose?: (result: TResult) => void) => {
        const key = openModal(modalProps => (
            <WrappedModal
                modalProps={modalProps}
                close={result => {
                    result && onClose?.(result);
                    closeModal(key);
                }}
                {...(props as TProps)}
            />
        ));
    };

    WrappedModal.displayName = Component.displayName || Component.name || "CustomModal";

    return WrappedModal;
}

