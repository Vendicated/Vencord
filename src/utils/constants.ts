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

import gitHash from "~git-hash";
import gitRemote from "~git-remote";

export const WEBPACK_CHUNK = "webpackChunkdiscord_app";
export const REACT_GLOBAL = "Vencord.Webpack.Common.React";
export const VENCORD_USER_AGENT = `Vencord/${gitHash}${gitRemote ? ` (https://github.com/${gitRemote})` : ""}`;

// Add yourself here if you made more than one plugin
export const Devs = Object.freeze({
    Ven: {
        name: "Vendicated",
        id: 343383572805058560n
    },
    Arjix: {
        name: "ArjixWasTaken",
        id: 674710789138939916n
    },
    Cyn: {
        name: "Cynosphere",
        id: 150745989836308480n
    },
    Megu: {
        name: "Megumin",
        id: 545581357812678656n
    },
    botato: {
        name: "botato",
        id: 440990343899643943n
    },
    obscurity: {
        name: "obscurity",
        id: 336678828233588736n,
    },
    rushii: {
        name: "rushii",
        id: 295190422244950017n
    },
    Glitch: {
        name: "Glitchy",
        id: 269567451199569920n
    },
    Samu: {
        name: "Samu",
        id: 702973430449832038n,
    },
    Animal: {
        name: "Animal",
        id: 118437263754395652n
    },
    MaiKokain: {
        name: "Mai",
        id: 722647978577363026n
    },
    echo: {
        name: "ECHO",
        id: 712639419785412668n
    },
    katlyn: {
        name: "katlyn",
        id: 250322741406859265n
    },
    Nuckyz: {
        name: "Nuckyz",
        id: 235834946571337729n
    }
});
