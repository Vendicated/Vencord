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

export {
    gitHash,
    gitRemote
};

export const WEBPACK_CHUNK = "webpackChunkdiscord_app";
export const REACT_GLOBAL = "Vencord.Webpack.Common.React";
export const VENCORD_USER_AGENT = `Vencord/${gitHash}${gitRemote ? ` (https://github.com/${gitRemote})` : ""}`;
export const SUPPORT_CHANNEL_ID = "1026515880080842772";

export interface Dev {
    name: string;
    id: bigint;
    badge?: boolean;
}

/**
 * If you made a plugin or substantial contribution, add yourself here.
 * This object is used for the plugin author list, as well as to add a contributor badge to your profile.
 * If you wish to stay fully anonymous, feel free to set ID to 0n.
 * If you are fine with attribution but don't want the badge, add badge: false
 */
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
    Nyako: {
        name: "nyako",
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
    },
    captain: {
        name: "Captain",
        id: 347366054806159360n
    },
    nick: {
        name: "nick",
        id: 347884694408265729n,
        badge: false
    },
    whqwert: {
        name: "whqwert",
        id: 586239091520176128n
    },
    lewisakura: {
        name: "lewisakura",
        id: 96269247411400704n
    },
    RuiNtD: {
        name: "RuiNtD",
        id: 157917665162297344n
    },
    hunt: {
        name: "hunt-g",
        id: 222800179697287168n
    },
    cloudburst: {
        name: "cloudburst",
        id: 892128204150685769n
    },
    Aria: {
        name: "Syncxv",
        id: 549244932213309442n,
    },
    TheKodeToad: {
        name: "TheKodeToad",
        id: 706152404072267788n
    },
    LordElias: {
        name: "LordElias",
        id: 319460781567639554n
    },
    juby: {
        name: "Juby210",
        id: 324622488644616195n
    },
    Alyxia: {
        name: "Alyxia Sother",
        id: 952185386350829688n
    },
    Remty: {
        name: "Remty",
        id: 335055032204656642n
    },
    skyevg: {
        name: "skyevg",
        id: 1090310844283363348n
    },
    Dziurwa: {
        name: "Dziurwa",
        id: 1001086404203389018n
    },
    F53: {
        name: "F53",
        id: 280411966126948353n
    },
    AutumnVN: {
        name: "AutumnVN",
        id: 393694671383166998n
    },
    pylix: {
        name: "pylix",
        id: 492949202121261067n
    },
    Tyler: {
        name: "\\\\GGTyler\\\\",
        id: 143117463788191746n
    },
    RyanCaoDev: {
        name: "RyanCaoDev",
        id: 952235800110694471n,
    },
    Strencher: {
        name: "Strencher",
        id: 415849376598982656n
    },
    FieryFlames: {
        name: "Fiery",
        id: 890228870559698955n
    },
    KannaDev: {
        name: "Kanna",
        id: 317728561106518019n
    },
    carince: {
        name: "carince",
        id: 818323528755314698n
    },
    PandaNinjas: {
        name: "PandaNinjas",
        id: 455128749071925248n
    },
    CatNoir: {
        name: "CatNoir",
        id: 260371016348336128n
    },
    outfoxxed: {
        name: "outfoxxed",
        id: 837425748435796060n
    },
    UwUDev: {
        name: "UwU",
        id: 691413039156690994n,
    },
    amia: {
        name: "amia",
        id: 142007603549962240n
    },
    phil: {
        name: "phil",
        id: 305288513941667851n
    },
    ImLvna: {
        name: "Luna <3",
        id: 799319081723232267n
    },
    rad: {
        name: "rad",
        id: 610945092504780823n
    },
    AndrewDLO: {
        name: "Andrew-DLO",
        id: 434135504792059917n
    },
    HypedDomi: {
        name: "HypedDomi",
        id: 354191516979429376n
    },
    Rini: {
        name: "Rini",
        id: 1079479184478441643n
    },
    castdrian: {
        name: "castdrian",
        id: 224617799434108928n
    },
    Arrow: {
        name: "arrow",
        id: 958158495302176778n
    },
    bb010g: {
        name: "bb010g",
        id: 72791153467990016n,
    },
    Lumap: {
        name: "lumap",
        id: 635383782576357407n
    },
    Dolfies: {
        name: "Dolfies",
        id: 852892297661906993n,
    },
    RuukuLada: {
        name: "RuukuLada",
        id: 119705748346241027n,
    },
    blahajZip: {
        name: "blahaj.zip",
        id: 683954422241427471n,
    },
    archeruwu: {
        name: "archer_uwu",
        id: 160068695383736320n
    },
    ProffDea: {
        name: "ProffDea",
        id: 609329952180928513n
    },
    ant0n: {
        name: "ant0n",
        id: 145224646868860928n
    },
    philipbry: {
        name: "philipbry",
        id: 554994003318276106n
    },
    Korbo: {
        name: "Korbo",
        id: 455856406420258827n
    },
    maisymoe: {
        name: "maisy",
        id: 257109471589957632n,
    },
} satisfies Record<string, Dev>);

// iife so #__PURE__ works correctly
export const DevsById = /* #__PURE__*/ (() =>
    Object.freeze(Object.fromEntries(
        Object.entries(Devs)
            .filter(d => d[1].id !== 0n)
            .map(([_, v]) => [v.id, v] as const)
    ))
)() as Record<string, Dev>;
