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

import { isPluginEnabled } from "@api/PluginManager";
import { definePluginSettings, migratePluginSettings } from "@api/Settings";
import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const ONEKO_IMAGE = "https://raw.githubusercontent.com/adryd325/oneko.js/c4ee66353b11a44e4a5b7e914a81f8d33111555e/oneko.gif";
const ONEKO_SCRIPT = "https://raw.githubusercontent.com/adryd325/oneko.js/c4ee66353b11a44e4a5b7e914a81f8d33111555e/oneko.js";
const FATASS_HORSE_SCRIPT = "https://raw.githubusercontent.com/nexpid/fatass-horse/351f158bfd8fafd44d9c17faad61f2a80bcd33e3/horse.js";
const FATASS_HORSE_ORIGINAL_IMAGE = "https://raw.githubusercontent.com/nexpid/fatass-horse/refs/heads/main/sheet.png";
const FATASS_HORSE_IMAGE = "https://raw.githubusercontent.com/nexpid/fatass-horse/351f158bfd8fafd44d9c17faad61f2a80bcd33e3/sheet.png";

const settings = definePluginSettings({
    buddy: {
        description: "Pick a cursor buddy",
        type: OptionType.SELECT,
        options: [
            {
                label: "Oneko",
                value: "oneko",
                default: true
            },
            {
                label: "Fatass Horse",
                value: "fathorse"
            }
        ],
        onChange: load,
    },
    speed: {
        description: "Speed of Da Cat :3",
        type: OptionType.NUMBER,
        default: 10,
        isValid: (value: number) => value >= 0 || "Speed must be bigger than 0",
        onChange: load,
    },
    fps: {
        description: "Framerate of the fatass horse",
        type: OptionType.NUMBER,
        default: 24,
        isValid: (value: number) => value > 0 || "Framerate must be bigger than 0",
        onChange: load
    },
    size: {
        description: "Size of the fatass horse",
        type: OptionType.NUMBER,
        default: 120,
        isValid: (value: number) => value > 0 || "Size must be bigger than 0",
        onChange: load
    },
    fade: {
        description: "If the horse should fade when the cursor is near",
        type: OptionType.BOOLEAN,
        default: true,
        onChange: load
    },
    freeroam: {
        description: "If the horse should roam freely when idle",
        type: OptionType.BOOLEAN,
        default: true,
        onChange: load
    },
    shake: {
        description: "If the horse should shake the window when it's walking",
        type: OptionType.BOOLEAN,
        default: false,
        onChange: load
    },
}, {
    fps: {
        disabled() { return this.store.buddy !== "fathorse"; },
    },
    size: {
        disabled() { return this.store.buddy !== "fathorse"; },
    },
    fade: {
        disabled() { return this.store.buddy !== "fathorse"; },
    },
    freeroam: {
        disabled() { return this.store.buddy !== "fathorse"; },
    },
    shake: {
        disabled() { return this.store.buddy !== "fathorse"; },
    }
});

function unload() {
    document.getElementById("oneko")?.remove();
    document.getElementById("fathorse")?.remove();
}

function load() {
    if (!isPluginEnabled("CursorBuddy")) return;
    unload();

    switch (settings.store.buddy) {
        case "oneko": {
            fetch(ONEKO_SCRIPT)
                .then(x => x.text())
                .then(s => s.replace("const nekoSpeed = 10;", `const nekoSpeed = ${settings.store.speed};`))
                .then(s => s.replace("./oneko.gif", ONEKO_IMAGE)
                    .replace("(isReducedMotion)", "(false)"))
                .then(eval);
            break;
        }
        case "fathorse": {
            fetch(FATASS_HORSE_SCRIPT)
                .then(x => x.text())
                .then(s => s.replace(FATASS_HORSE_ORIGINAL_IMAGE, FATASS_HORSE_IMAGE))
                .then(s => (0, eval)(s)({
                    speed: settings.store.speed,
                    fps: settings.store.fps,
                    size: settings.store.size,
                    fade: settings.store.fade,
                    freeroam: settings.store.freeroam,
                    shake: settings.store.shake
                }));
        }
    }
}

migratePluginSettings("CursorBuddy", "Oneko", "oneko");
export default definePlugin({
    name: "CursorBuddy",
    description: "only a slightly annoying plugin",
    authors: [Devs.Ven, Devs.adryd, EquicordDevs.nexpid],
    settings,
    isModified: true,

    start: load,
    stop: unload,
});
