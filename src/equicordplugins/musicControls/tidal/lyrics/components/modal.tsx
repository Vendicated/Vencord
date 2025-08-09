/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ModalContent, ModalHeader, ModalProps, ModalRoot } from "@utils/modal";
import { Text } from "@webpack/common";

import { TidalStore, Track } from "../../TidalStore";
import { cl, NoteSvg, scrollClasses, useLyrics } from "./util";

const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

function ModalHeaderContent({ track }: { track: Track; }) {
    return (
        <ModalHeader>
            <div className={cl("header-content")}>
                {track?.imageSrc && (
                    <img
                        src={track.imageSrc}
                        alt={track.album || track.name}
                        className={cl("album-image")}
                    />
                )}
                <div>
                    <Text selectable variant="text-sm/semibold">{track.name}</Text>
                    <Text selectable variant="text-sm/normal">by {track.artist}</Text>
                    {track.album && <Text selectable variant="text-sm/normal">on {track.album}</Text>}
                </div>
            </div>
        </ModalHeader>
    );
}

export function LyricsModal({ rootProps }: { rootProps: ModalProps; }) {
    const { track, lyrics, currLrcIndex } = useLyrics({ scroll: false });
    const currentLyrics = lyrics || null;

    return (
        <ModalRoot {...rootProps}>
            {track && <ModalHeaderContent track={track} />}
            <ModalContent>
                <div className={cl("lyrics-modal-container") + ` ${scrollClasses.auto}`}>
                    {currentLyrics ? (
                        currentLyrics.map((line, i) => (
                            <Text
                                key={i}
                                variant={currLrcIndex === i ? "text-md/semibold" : "text-sm/normal"}
                                selectable
                                className={currLrcIndex === i ? cl("modal-line-current") : cl("modal-line")}
                            >
                                <span className={cl("modal-timestamp")}
                                    onClick={() => TidalStore.seek(line.time * 1000)}
                                >
                                    {formatTime(line.time)}
                                </span>{line.text || NoteSvg(cl("modal-note"))}
                            </Text>
                        ))
                    ) : (
                        <Text variant="text-sm/normal" className={cl("modal-no-lyrics")}>No lyrics available :(</Text>
                    )}
                </div>
            </ModalContent>
        </ModalRoot>
    );
}
