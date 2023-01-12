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

// Add yourself here if you made a plugin
export const Devs = /* #__PURE__*/ Object.freeze({
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
    nea: {
        name: "nea",
        id: 310702108997320705n,
    },
    Nuckyz: {
        name: "Nuckyz",
        id: 235834946571337729n
    },
    D3SOX: {
        name: "D3SOX",
        id: 201052085641281538n
    },
    Nickyux: {
        name: "Nickyux",
        id: 427146305651998721n
    },
    mantikafasi: {
        name: "mantikafasi",
        id: 287555395151593473n
    },
    Xinto: {
        name: "Xinto",
        id: 423915768191647755n
    },
    JacobTm: {
        name: "Jacob.Tm",
        id: 302872992097107991n
    },
    DustyAngel47: {
        name: "DustyAngel47",
        id: 714583473804935238n
    },
    BanTheNons: {
        name: "BanTheNons",
        id: 460478012794863637n
    },
    BigDuck: {
        name: "BigDuck",
        id: 1024588272623681609n
    },
    AverageReactEnjoyer: {
        name: "Average React Enjoyer",
        id: 1004904120056029256n
    },
    adryd: {
        name: "adryd",
        id: 0n
    },
    Tyman: {
        name: "Tyman",
        id: 487443883127472129n
    },
    afn: {
        name: "afn",
        id: 420043923822608384n
    },
    KraXen72: {
        name: "KraXen72",
        id: 379304073515499530n
    },
    kemo: {
        name: "kemo",
        id: 299693897859465228n
    },
    dzshn: {
        name: "dzshn",
        id: 310449948011528192n
    },
    Ducko: {
        name: "Ducko",
        id: 506482395269169153n
    },
    jewdev: {
        name: "jewdev",
        id: 222369866529636353n
    },
    Luna: {
        name: "Luny",
        id: 821472922140803112n
    },
    Vap: {
        name: "Vap0r1ze",
        id: 454072114492866560n
    },
    KingFish: {
        name: "King Fish",
        id: 499400512559382538n
    },
    Commandtechno: {
        name: "Commandtechno",
        id: 296776625432035328n,
    },
    TheSun: {
        name: "ActuallyTheSun",
        id: 406028027768733696n
    },
    axyie: {
        name: "'ax",
        id: 273562710745284628n,
    },
    pointy: {
        name: "pointy",
        id: 99914384989519872n
    },
    SammCheese: {
        name: "Samm-Cheese",
        id: 372148345894076416n
    },
    zt: {
        name: "zt",
        id: 289556910426816513n
    }
});
