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

import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

let click1, click2, click3, backspace;
let sounds = {
    click1,
    click2,
    click3,
    backspace
};

const ignoredKeys = ["CapsLock", "ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight", "AltLeft", "AltRight", "MetaLeft", "MetaRight", "ArrowUp", "ArrowRight", "ArrowLeft", "ArrowDown", "MediaPlayPause", "MediaStop", "MediaTrackNext", "MediaTrackPrevious", "MediaSelect", "MediaEject", "MediaVolumeUp", "MediaVolumeDown", "AudioVolumeUp", "AudioVolumeDown"];

const keydown = (e: KeyboardEvent) => {
    if (ignoredKeys.includes(e.code)) return;
    for (const sound of Object.values(sounds)) sound.pause();
    if (e.code === "Backspace") {
        sounds.backspace.currentTime = 0;
        sounds.backspace.play();
    } else {
        const click = sounds[`click${Math.floor(Math.random() * 3) + 1}`];
        click.currentTime = 0;
        click.play();
    }
};

export default definePlugin({
    name: "KeyboardSounds",
    description: "Adds the Opera GX Keyboard Sounds to Discord",
    authors: [Devs.HypedDomi],
    start: () => {
        click1 = new Audio("https://github.com/Equicord/Equibored/raw/main/sounds/keyboard/click1.wav");
        click2 = new Audio("https://github.com/Equicord/Equibored/raw/main/sounds/keyboard/click2.wav");
        click3 = new Audio("https://github.com/Equicord/Equibored/raw/main/sounds/keyboard/click3.wav");
        backspace = new Audio("https://github.com/Equicord/Equibored/raw/main/sounds/keyboard/backspace.wav");
        sounds = {
            click1,
            click2,
            click3,
            backspace,
        };
        document.addEventListener("keydown", keydown);
    },
    stop: () => document.removeEventListener("keydown", keydown),
    options: {
        volume: {
            description: "Volume",
            type: OptionType.SLIDER,
            markers: [0, 100],
            stickToMarkers: false,
            default: 100,
            onChange: value => { for (const sound of Object.values(sounds)) sound.volume = value / 100; }
        }
    }
});
