/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { AudioPlayerInterface, createAudioPlayer } from "@api/AudioPlayer";
import { HeaderBarButton } from "@api/HeaderBar";
import { definePluginSettings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import { ModalProps, ModalRoot, openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { React } from "@webpack/common";
let boopSound: AudioPlayerInterface;
let song: AudioPlayerInterface;

function assignSong(url: string, volume: number) {
    song?.delete();
    song = createAudioPlayer(url, { volume, preload: true, persistent: true });
    song.load();
}

function assignBoop(url: string, volume: number) {
    boopSound?.delete();
    boopSound = createAudioPlayer(url, { volume, preload: true, persistent: true });
    boopSound.load();
}

function SoggyModal(props: ModalProps) {
    if (settings.store.songVolume !== 0) {
        React.useEffect(() => {
            song?.loop();

            return () => {
                song?.stop();
            };
        }, []);
    }

    const boop = (e: React.MouseEvent<HTMLImageElement>) => {
        const { offsetX, offsetY } = e.nativeEvent;

        const region = { x: 155, y: 220, width: 70, height: 70 };

        if (
            settings.store.boopVolume !== 0 &&
            offsetX >= region.x &&
            offsetX <= region.x + region.width &&
            offsetY >= region.y &&
            offsetY <= region.y + region.height
        ) {
            boopSound?.play();
        }
    };

    return (
        <ModalRoot {...props}>
            <img
                src={settings.store.imageLink}
                onClick={boop}
                style={{ display: "block" }}

            />
        </ModalRoot >
    );
}

function buildSoggyModal(): any {
    openModal(props => <SoggyModal {...props} />);
}

function SoggyButton() {
    return (
        <HeaderBarButton
            className="soggy-button"
            tooltip={settings.store.tooltipText}
            icon={() => (
                <img
                    alt=""
                    src={settings.store.imageLink}
                    width={24}
                    height={24}
                    draggable={false}
                    style={{ pointerEvents: "none" }}
                />
            )}
            onClick={() => buildSoggyModal()}
            selected={false}
        />
    );
}

const settings = definePluginSettings({
    songVolume: {
        description: "Volume of the song. 0 to disable",
        type: OptionType.SLIDER,
        default: 0.25,
        markers: [0, 0.25, 0.5, 0.75, 1],
        stickToMarkers: false,

    },
    boopVolume: {
        description: "Volume of the boop sound",
        type: OptionType.SLIDER,
        default: 0.2,
        markers: [0, 0.25, 0.5, 0.75, 1],
        stickToMarkers: false,
    },
    tooltipText: {
        description: "The text shown when hovering over the button",
        type: OptionType.STRING,
        default: "the soggy",
    },
    imageLink: {
        description: "URL for the image (button and modal)",
        type: OptionType.STRING,
        default: "https://cdn.nest.rip/uploads/ecf0ef5b-55d1-4da7-9e5c-e469569a9731.png",
    },
    songLink: {
        description: "URL for the song to play",
        type: OptionType.STRING,
        default: "https://github.com/Equicord/Equibored/raw/main/sounds/soggy/song.mp3?raw=true",
        onChange(newValue) {
            assignSong(newValue, settings.store.songVolume * 100);
        },
    },
    boopLink: {
        description: "URL for the boop sound",
        type: OptionType.STRING,
        default: "https://github.com/Equicord/Equibored/raw/main/sounds/soggy/honk.wav?raw=true",
        onChange(newValue) {
            assignBoop(newValue, settings.store.boopVolume * 100);
        }
    }
});

export default definePlugin({
    name: "Soggy",
    description: "Adds a soggy button to the toolbox",
    authors: [EquicordDevs.sliwka],
    settings,
    dependencies: ["AudioPlayerAPI"],

    headerBarButton: {
        icon: () => (
            <img
                alt=""
                src={settings.store.imageLink}
                width={24}
                height={24}
                draggable={false}
                style={{ pointerEvents: "none" }}
            />
        ),
        render: SoggyButton
    },

    start() {
        assignBoop(settings.store.boopLink, settings.store.boopVolume * 100);
        assignSong(settings.store.songLink, settings.store.songVolume * 100);
    },

    stop() {
        boopSound?.delete();
        song?.delete();
    },
});
