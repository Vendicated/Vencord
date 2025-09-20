/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { AudioPlayerInterface, createAudioPlayer } from "@api/AudioPlayer";
import { definePluginSettings } from "@api/Settings";
import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

import { ignoredKeys, packs } from "./packs";

const allSounds = {
    backspaces: [] as { playing: boolean; player: AudioPlayerInterface; }[],
    caps: [] as { playing: boolean; player: AudioPlayerInterface; }[],
    enters: [] as { playing: boolean; player: AudioPlayerInterface; }[],
    arrows: [] as { playing: boolean; player: AudioPlayerInterface; }[],
    others: [] as { playing: boolean; player: AudioPlayerInterface; }[]
};

let chosenPack: typeof packs[keyof typeof packs];
const keysCurrentlyPressed = new Set<string>();

const keyup = (e: KeyboardEvent) => { keysCurrentlyPressed.delete(e.code); };

const keydown = (e: KeyboardEvent) => {
    if (!chosenPack) return;
    if (ignoredKeys.includes(e.code) && !chosenPack.allowedIgnored?.includes(e.key)) return;
    if (keysCurrentlyPressed.has(e.code)) return;
    keysCurrentlyPressed.add(e.code);

    function getRandomSound(soundsArray: { playing: boolean; player: AudioPlayerInterface; }[]) {
        const nonplayingSounds = soundsArray.filter(sound => !sound?.playing);
        let randomIndex;
        let chosenSound;

        if (nonplayingSounds.length) {
            randomIndex = Math.floor(Math.random() * nonplayingSounds.length);
            chosenSound = nonplayingSounds[randomIndex];
        } else {
            randomIndex = Math.floor(Math.random() * soundsArray.length);
            chosenSound = soundsArray[randomIndex];
        }

        if (chosenSound) {
            chosenSound.playing = true;
            chosenSound.player.restart();
        }
    }

    if (e.code === "Backspace" && allSounds.backspaces.length) {
        getRandomSound(allSounds.backspaces);
    } else if (e.code === "CapsLock" && allSounds.caps.length) {
        getRandomSound(allSounds.caps);
    } else if (e.code === "Enter" && allSounds.enters.length) {
        getRandomSound(allSounds.enters);
    } else if (["ArrowUp", "ArrowRight", "ArrowLeft", "ArrowDown"].includes(e.code) && allSounds.arrows.length) {
        getRandomSound(allSounds.arrows);
    } else if (allSounds.others.length) {
        getRandomSound(allSounds.others);
    }
};

function clearSounds() {
    Array.from(Object.values(allSounds)).forEach(soundsArray => { soundsArray.forEach(sound => sound.player.delete()); });
    Object.keys(allSounds).forEach(key => { allSounds[key as keyof typeof allSounds] = []; });
}

function assignSounds(volume: number, pack: "operagx" | "osu") {
    clearSounds();
    chosenPack = packs[pack];

    if (!chosenPack) {
        return;
    }

    function addSounds(key: keyof typeof allSounds) {
        if (!chosenPack[key]) return;
        let soundIndex = -1;

        for (let i = 0; i < 3; i++) {
            for (const url of chosenPack[key]) {
                soundIndex++;

                allSounds[key].push({
                    playing: false,
                    player: createAudioPlayer(url, {
                        volume,
                        preload: true,
                        persistent: true,
                        onEnded: () => { allSounds[key][soundIndex].playing = false; }
                    })
                });
            }
        }
    }

    chosenPack.backspaces && addSounds("backspaces");
    chosenPack.caps && addSounds("caps");
    chosenPack.enters && addSounds("enters");
    chosenPack.arrows && addSounds("arrows");
    chosenPack.others && addSounds("others");
}

const settings = definePluginSettings({
    volume: {
        description: "Volume of the keyboard sounds.",
        type: OptionType.SLIDER,
        markers: [0, 25, 50, 75, 100],
        stickToMarkers: false,
        default: 100,
        onChange: value => { assignSounds(value, settings.store.soundPack); }
    },
    soundPack: {
        description: "Sound pack to use.",
        type: OptionType.SELECT,
        options: [
            { label: "OperaGX", value: "operagx" as "operagx", default: true },
            { label: "osu!", value: "osu" as "osu" }
        ],
        onChange: value => { assignSounds(settings.store.volume, value); }
    }
});

export default definePlugin({
    name: "KeyboardSounds",
    description: "Adds OperaGX or osu! sound effects when typing on your keyboard.",
    authors: [Devs.HypedDomi, EquicordDevs.Etorix],
    dependencies: ["AudioPlayerAPI"],
    settings,
    start() {
        assignSounds(settings.store.volume, settings.store.soundPack);
        document.addEventListener("keyup", keyup);
        document.addEventListener("keydown", keydown);
    },
    stop: () => {
        clearSounds();
        document.removeEventListener("keyup", keyup);
        document.removeEventListener("keydown", keydown);
    },
});
