/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { AudioPlayerInterface, createAudioPlayer } from "@api/AudioPlayer";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

let backspace: AudioPlayerInterface;
let clicks: Array<{ playing: boolean; player: AudioPlayerInterface; }> = [];
const keysCurrentlyPressed = new Set<string>();
let previousSoundIndex = 0;

const ignoredKeys = ["CapsLock", "ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight", "AltLeft", "AltRight", "MetaLeft", "MetaRight", "ArrowUp", "ArrowRight", "ArrowLeft", "ArrowDown", "MediaPlayPause", "MediaStop", "MediaTrackNext", "MediaTrackPrevious", "MediaSelect", "MediaEject", "MediaVolumeUp", "MediaVolumeDown", "AudioVolumeUp", "AudioVolumeDown"];

const keyup = (e: KeyboardEvent) => { keysCurrentlyPressed.delete(e.code); };

const keydown = (e: KeyboardEvent) => {
    if (ignoredKeys.includes(e.code)) return;
    if (!clicks.length || !backspace) return;
    if (keysCurrentlyPressed.has(e.code)) return;
    keysCurrentlyPressed.add(e.code);

    if (e.code === "Backspace") {
        backspace.restart();
    } else {
        const nonplayingClicks = clicks.filter(click => !click.playing);
        const randomIndex = Math.floor(Math.random() * nonplayingClicks.length);
        const chosenClick = nonplayingClicks.length ? nonplayingClicks[randomIndex] : clicks[previousSoundIndex];
        previousSoundIndex = randomIndex;
        chosenClick.playing = true;
        chosenClick.player.restart();
    }
};

function assignSounds(volume: number) {
    backspace = createAudioPlayer("https://github.com/Equicord/Equibored/raw/main/sounds/keyboard/backspace.wav", { volume, preload: true, persistent: true });
    clicks = [];

    for (let i = 0; i < 3; i++) {
        const baseIndex = i * 3;
        clicks.push({ playing: false, player: createAudioPlayer("https://github.com/Equicord/Equibored/raw/main/sounds/keyboard/click1.wav", { volume, preload: true, persistent: true, onEnded: () => { clicks[baseIndex].playing = false; } }) });
        clicks.push({ playing: false, player: createAudioPlayer("https://github.com/Equicord/Equibored/raw/main/sounds/keyboard/click2.wav", { volume, preload: true, persistent: true, onEnded: () => { clicks[baseIndex + 1].playing = false; } }) });
        clicks.push({ playing: false, player: createAudioPlayer("https://github.com/Equicord/Equibored/raw/main/sounds/keyboard/click3.wav", { volume, preload: true, persistent: true, onEnded: () => { clicks[baseIndex + 2].playing = false; } }) });
    }
}

const settings = definePluginSettings({
    volume: {
        description: "Volume of the keyboard sounds.",
        type: OptionType.SLIDER,
        markers: [0, 25, 50, 75, 100],
        stickToMarkers: false,
        default: 100,
        onChange: value => { assignSounds(value); }
    }
});

export default definePlugin({
    name: "KeyboardSounds",
    description: "Adds the Opera GX Keyboard Sounds to Discord",
    authors: [Devs.HypedDomi],
    dependencies: ["AudioPlayerAPI"],
    settings,
    start() {
        assignSounds(settings.store.volume);
        document.addEventListener("keyup", keyup);
        document.addEventListener("keydown", keydown);
    },
    stop: () => {
        [...clicks, { player: backspace }].forEach(sound => sound.player.delete());
        document.removeEventListener("keyup", keyup);
        document.removeEventListener("keydown", keydown);
    },
});
