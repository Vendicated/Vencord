/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { EquicordDevs } from "@utils/constants";
import { ModalProps, ModalRoot, openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import { React } from "@webpack/common";

const HeaderBarIcon = findComponentByCodeLazy(".HEADER_BAR_BADGE_TOP:", '.iconBadge,"top"');

let preloadSong, preloadBoopSound, song, boopSound;

function SoggyModal(props: ModalProps) {
    if (settings.store.songVolume !== 0) {
        React.useEffect(() => {
            song = new Audio(preloadSong.src);
            song.volume = settings.store.songVolume;
            song.play();

            return () => {
                song.pause();
                song.remove();
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
            boopSound = new Audio(preloadBoopSound.src);
            boopSound.volume = settings.store.boopVolume;
            boopSound.play();
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
        <HeaderBarIcon
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
        default: "https://cdn.nest.rip/uploads/a0df62f0-39ee-4d2d-86a9-033ede2156f0.webp",
    },
    songLink: {
        description: "URL for the song to play",
        type: OptionType.STRING,
        default: "https://github.com/Equicord/Equibored/raw/main/sounds/soggy/song.mp3?raw=true",
        onChange: (value: string) => {
            song = new Audio(value);
        }
    },
    boopLink: {
        description: "URL for the boop sound",
        type: OptionType.STRING,
        default: "https://github.com/Equicord/Equibored/raw/main/sounds/soggy/honk.wav?raw=true",
        onChange: (value: string) => {
            boopSound = new Audio(value);
        }
    }
});

export default definePlugin({
    name: "Soggy",
    description: "Adds a soggy button to the toolbox",
    authors: [EquicordDevs.sliwka],
    settings,
    patches: [
        {
            find: ".controlButtonWrapper,",
            replacement: {
                match: /(function \i\(\i\){)(.{1,200}toolbar.{1,450}mobileToolbar)/,
                replace: "$1$self.addIconToToolBar(arguments[0]);$2"
            }
        }
    ],

    start: () => {
        preloadSong = new Audio(settings.store.songLink);
        preloadBoopSound = new Audio(settings.store.boopLink);
    },

    // taken from message logger lol
    addIconToToolBar(e: { toolbar: React.ReactNode[] | React.ReactNode; }) {
        if (Array.isArray(e.toolbar))
            return e.toolbar.unshift(
                <ErrorBoundary noop={true}>
                    <SoggyButton />
                </ErrorBoundary>
            );

        e.toolbar = [
            <ErrorBoundary noop={true} key={"MessageLoggerEnhanced"} >
                <SoggyButton />
            </ErrorBoundary>,
            e.toolbar,
        ];
    },
});
