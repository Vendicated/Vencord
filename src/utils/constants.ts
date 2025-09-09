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

export const REACT_GLOBAL = "Vencord.Webpack.Common.React";

// Equicord
export const SUPPORT_CHANNEL_ID = "1297590739911573585";
export const GUILD_ID = "1173279886065029291";
export const DONOR_ROLE_ID = "1173316879083896912";
export const CONTRIB_ROLE_ID = "1222677964760682556";
export const EQUICORD_TEAM = "1173520023239786538";
export const EQUICORD_HELPERS = "1326406112144265257";
export const EQUIBOP_CONTRIB_ROLE_ID = "1287079931645263968";
export const VENCORD_CONTRIB_ROLE_ID = "1173343399470964856";

// Vencord
export const VC_SUPPORT_CHANNEL_ID = "1026515880080842772";
export const VC_GUILD_ID = "1015060230222131221";
export const VENBOT_USER_ID = "1017176847865352332";
export const VC_DONOR_ROLE_ID = "1042507929485586532";
export const VC_CONTRIB_ROLE_ID = "1026534353167208489";
export const VC_REGULAR_ROLE_ID = "1026504932959977532";
export const VC_SUPPORT_CATEGORY_ID = "1108135649699180705";
export const VC_KNOWN_ISSUES_CHANNEL_ID = "1222936386626129920";
export const VESKTOP_SUPPORT_CHANNEL_ID = "1345457031426871417";
export const VC_SUPPORT_CHANNEL_IDS = [VC_SUPPORT_CHANNEL_ID, VESKTOP_SUPPORT_CHANNEL_ID];

export const GUILD_IDS = [GUILD_ID, VC_GUILD_ID];
export const SUPPORT_CHANNEL_IDS = [SUPPORT_CHANNEL_ID, VC_SUPPORT_CHANNEL_ID];
export const DONOR_ROLE_IDS = [DONOR_ROLE_ID, VC_DONOR_ROLE_ID];
export const CONTRIB_ROLE_IDS = [CONTRIB_ROLE_ID, EQUIBOP_CONTRIB_ROLE_ID, VENCORD_CONTRIB_ROLE_ID, VC_CONTRIB_ROLE_ID];

const platform = navigator.platform.toLowerCase();
export const IS_WINDOWS = platform.startsWith("win");
export const IS_MAC = platform.startsWith("mac");
export const IS_LINUX = platform.startsWith("linux");

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
        name: "V",
        id: 343383572805058560n
    },
    Apexo: {
        name: "Apexo",
        id: 228548952687902720n
    },
    Arjix: {
        name: "ArjixWasTaken",
        id: 674710789138939916n,
        badge: false
    },
    Cyn: {
        name: "Cynosphere",
        id: 150745989836308480n
    },
    Trwy: {
        name: "trey",
        id: 354427199023218689n
    },
    Megu: {
        name: "Megumin",
        id: 545581357812678656n
    },
    botato: {
        name: "botato",
        id: 440990343899643943n
    },
    fawn: {
        name: "fawn",
        id: 336678828233588736n
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
        id: 702973430449832038n
    },
    Nyako: {
        name: "nyako",
        id: 118437263754395652n
    },
    MaiKokain: {
        name: "Mai",
        id: 722647978577363026n
    },
    amy: {
        name: "Amy",
        id: 603229858612510720n
    },
    katlyn: {
        name: "katlyn",
        id: 250322741406859265n
    },
    nea: {
        name: "nea",
        id: 310702108997320705n
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
        id: 715746190813298788n
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
        id: 296776625432035328n
    },
    TheSun: {
        name: "sunnie",
        id: 406028027768733696n
    },
    rae: {
        name: "rae",
        id: 1398136199503282277n
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
        id: 549244932213309442n
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
    arHSM: {
        name: "arHSM",
        id: 841509053422632990n
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
        id: 952235800110694471n
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
        id: 691413039156690994n
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
        name: "lillith <3",
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
        id: 72791153467990016n
    },
    Dolfies: {
        name: "Dolfies",
        id: 852892297661906993n
    },
    RuukuLada: {
        name: "RuukuLada",
        id: 119705748346241027n
    },
    blahajZip: {
        name: "blahaj.zip",
        id: 683954422241427471n
    },
    archeruwu: {
        name: "archer_uwu",
        id: 160068695383736320n
    },
    ProffDea: {
        name: "ProffDea",
        id: 609329952180928513n
    },
    UlyssesZhan: {
        name: "UlyssesZhan",
        id: 586808226058862623n
    },
    ant0n: {
        name: "ant0n",
        id: 145224646868860928n
    },
    Board: {
        name: "BoardTM",
        id: 285475344817848320n
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
        id: 257109471589957632n
    },
    Lexi: {
        name: "Lexi",
        id: 506101469787717658n
    },
    Mopi: {
        name: "Mopi",
        id: 1022189106614243350n
    },
    Grzesiek11: {
        name: "Grzesiek11",
        id: 368475654662127616n
    },
    Samwich: {
        name: "Samwich",
        id: 976176454511509554n
    },
    coolelectronics: {
        name: "coolelectronics",
        id: 696392247205298207n
    },
    Av32000: {
        name: "Av32000",
        id: 593436735380127770n
    },
    Noxillio: {
        name: "Noxillio",
        id: 138616536502894592n
    },
    Kyuuhachi: {
        name: "Kyuuhachi",
        id: 236588665420251137n
    },
    nin0dev: {
        name: "nin0dev",
        id: 886685857560539176n
    },
    Elvyra: {
        name: "Elvyra",
        id: 708275751816003615n
    },
    HappyEnderman: {
        name: "Happy enderman",
        id: 1083437693347827764n
    },
    Vishnya: {
        name: "Vishnya",
        id: 282541644484575233n
    },
    Inbestigator: {
        name: "Inbestigator",
        id: 761777382041714690n
    },
    newwares: {
        name: "newwares",
        id: 421405303951851520n
    },
    JohnyTheCarrot: {
        name: "JohnyTheCarrot",
        id: 132819036282159104n
    },
    puv: {
        name: "puv",
        id: 469441552251355137n
    },
    Kodarru: {
        name: "Kodarru",
        id: 785227396218748949n
    },
    nakoyasha: {
        name: "nakoyasha",
        id: 222069018507345921n
    },
    Sqaaakoi: {
        name: "Sqaaakoi",
        id: 259558259491340288n
    },
    Byeoon: {
        name: "byeoon",
        id: 1167275288036655133n
    },
    Kaitlyn: {
        name: "kaitlyn",
        id: 306158896630988801n
    },
    PolisanTheEasyNick: {
        name: "Oleh Polisan",
        id: 242305263313485825n
    },
    HAHALOSAH: {
        name: "HAHALOSAH",
        id: 903418691268513883n
    },
    GabiRP: {
        name: "GabiRP",
        id: 507955112027750401n
    },
    ImBanana: {
        name: "Im_Banana",
        id: 635250116688871425n
    },
    xocherry: {
        name: "xocherry",
        id: 221288171013406720n
    },
    ScattrdBlade: {
        name: "ScattrdBlade",
        id: 678007540608532491n
    },
    goodbee: {
        name: "goodbee",
        id: 658968552606400512n
    },
    Moxxie: {
        name: "Moxxie",
        id: 712653921692155965n
    },
    Ethan: {
        name: "Ethan",
        id: 721717126523781240n
    },
    nyx: {
        name: "verticalsync.",
        id: 1207087393929171095n
    },
    nekohaxx: {
        name: "nekohaxx",
        id: 1176270221628153886n
    },
    Antti: {
        name: "Antti",
        id: 312974985876471810n
    },
    Joona: {
        name: "Joona",
        id: 297410829589020673n
    },
    sadan: {
        name: "sadan",
        id: 521819891141967883n
    },
    Kylie: {
        name: "Cookie",
        id: 721853658941227088n
    },
    AshtonMemer: {
        name: "AshtonMemer",
        id: 373657230530052099n
    },
    surgedevs: {
        name: "Chloe",
        id: 1084592643784331324n
    },
    Lumap: {
        name: "Lumap",
        id: 585278686291427338n
    },
    Obsidian: {
        name: "Obsidian",
        id: 683171006717755446n
    },
    SerStars: {
        name: "SerStars",
        id: 861631850681729045n
    },
    niko: {
        name: "niko",
        id: 341377368075796483n
    },
    relitrix: {
        name: "Relitrix",
        id: 423165393901715456n
    },
    RamziAH: {
        name: "RamziAH",
        id: 1279957227612147747n
    },
    SomeAspy: {
        name: "SomeAspy",
        id: 516750892372852754n
    },
    jamesbt365: {
        name: "jamesbt365",
        id: 158567567487795200n,
    },
    samsam: {
        name: "samsam",
        id: 400482410279469056n,
    },
    Cootshk: {
        name: "Cootshk",
        id: 921605971577548820n
    },
    thororen: {
        name: "thororen",
        id: 848339671629299742n
    },
} satisfies Record<string, Dev>);

export const EquicordDevs = Object.freeze({
    nobody: {
        name: "nobody",
        id: 0n
    },
    thororen: {
        name: "thororen",
        id: 848339671629299742n
    },
    dotdas: {
        name: "dotdas",
        id: 353229259482857475n
    },
    nyx: {
        name: "verticalsync",
        id: 1207087393929171095n
    },
    Cortex: {
        name: "Cortex",
        id: 913205935319691335n
    },
    KrystalSkull: {
        name: "krystalskullofficial",
        id: 929208515883569182n
    },
    Naibuu: {
        name: "hs50",
        id: 1120045713867423835n
    },
    Ven: {
        name: "Vee",
        id: 343383572805058560n
    },
    nexpid: {
        name: "Nexpid",
        id: 853550207039832084n
    },
    FoxStorm1: {
        name: "FoxStorm1",
        id: 789872551731527690n
    },
    camila314: {
        name: "camila314",
        id: 738592270617542716n
    },
    Wolfie: {
        name: "wolfieeeeeeee",
        id: 347096063569559553n
    },
    ryan: {
        name: "ryan",
        id: 479403382994632704n
    },
    MrDiamond: {
        name: "MrDiamond",
        id: 523338295644782592n
    },
    Fres: {
        name: "fres",
        id: 843448897737064448n
    },
    Dams: {
        name: "Dams",
        id: 769939285792653325n
    },
    KawaiianPizza: {
        name: "KawaiianPizza",
        id: 501000986735673347n
    },
    Perny: {
        name: "Perny",
        id: 1101508982570504244n
    },
    Jaxx: {
        name: "Jaxx",
        id: 901016640253227059n
    },
    Balaclava: {
        name: "Balaclava",
        id: 854886148455399436n
    },
    dat_insanity: {
        name: "dat_insanity",
        id: 0n
    },
    coolesding: {
        name: "cooles",
        id: 406084422308331522n
    },
    SerStars: {
        name: "SerStars",
        id: 861631850681729045n
    },
    MaxHerbold: {
        name: "MaxHerbold",
        id: 1189527130611138663n
    },
    Combatmaster: {
        name: "Combatmaster331",
        id: 790562534503612437n
    },
    Megal: {
        name: "Megal",
        id: 387790666484285441n
    },
    Synth: {
        name: "synthxcx",
        id: 934393331562205195n
    },
    Hanzy: {
        name: "hanzydev",
        id: 1093131781043126322n
    },
    zoodogood: {
        name: "zoodogood",
        id: 921403577539387454n
    },
    Drag: {
        name: "dragalt_",
        id: 1189903210564038697n
    },
    bhop: {
        name: "femeie",
        id: 442626774841556992n
    },
    Panniku: {
        name: "Panniku",
        id: 703634705152606318n
    },
    Tolgchu: {
        name: "✨Tolgchu✨",
        id: 329671025312923648n
    },
    DaBluLite: {
        name: "DaBluLite",
        id: 582170007505731594n
    },
    meowabyte: {
        name: "meowabyte",
        id: 105170831130234880n
    },
    Fafa: {
        name: "Fafa",
        id: 428188716641812481n
    },
    Colorman: {
        name: "colorman",
        id: 298842558610800650n
    },
    walrus: {
        name: "walrus",
        id: 305317288775778306n
    },
    Prince527: {
        name: "Prince527",
        id: 364105797162237952n
    },
    ThePirateStoner: {
        name: "ThePirateStoner",
        id: 1196220620376121381n
    },
    Sampath: {
        name: "Sampath",
        id: 984015688807100419n
    },
    catcraft: {
        name: "catcraft",
        id: 290162449213292546n
    },
    ShadyGoat: {
        name: "Shady Goat",
        id: 376079696489742338n
    },
    Joona: {
        name: "Joona",
        id: 297410829589020673n
    },
    SimplyData: {
        name: "SimplyData",
        id: 301494563514613762n
    },
    keifufu: {
        name: "keifufu",
        id: 469588398110146590n
    },
    Blackilykat: {
        name: "Blackilykat",
        id: 442033332952498177n
    },
    niko: {
        name: "niko",
        id: 341377368075796483n
    },
    sadan: {
        name: "sadan",
        id: 521819891141967883n
    },
    x3rt: {
        name: "x3rt",
        id: 131602100332396544n
    },
    Hen: {
        name: "Hen",
        id: 279266228151779329n
    },
    Crxa: {
        name: "Crxa",
        id: 711604934201704469n
    },
    vmohammad: {
        name: "vMohammad",
        id: 840854894881538079n
    },
    SpikeHD: {
        name: "SpikeHD",
        id: 221757857836564485n
    },
    bep: {
        name: "bep",
        id: 0n
    },
    llytz: {
        name: "llytz",
        id: 1271128098301022240n
    },
    nin0dev: {
        name: "nin0dev",
        id: 886685857560539176n
    },
    D3SOX: {
        name: "D3SOX",
        id: 201052085641281538n
    },
    newwares: {
        name: "newwares",
        id: 421405303951851520n
    },
    Kyuuhachi: {
        name: "Kyuuhachi",
        id: 236588665420251137n
    },
    ImLvna: {
        name: "lillith <3",
        id: 799319081723232267n
    },
    AutumnVN: {
        name: "AutumnVN",
        id: 393694671383166998n
    },
    Arjix: {
        name: "ArjixWasTaken",
        id: 674710789138939916n,
        badge: false
    },
    Inbestigator: {
        name: "Inbestigator",
        id: 761777382041714690n
    },
    Sqaaakoi: {
        name: "Sqaaakoi",
        id: 259558259491340288n
    },
    Samwich: {
        name: "Samwich",
        id: 976176454511509554n
    },
    TheSun: {
        name: "sunnie",
        id: 406028027768733696n
    },
    TheKodeToad: {
        name: "TheKodeToad",
        id: 706152404072267788n
    },
    Nickyux: {
        name: "Nickyux",
        id: 427146305651998721n
    },
    Ethan: {
        name: "Ethan",
        id: 721717126523781240n
    },
    castdrian: {
        name: "castdrian",
        id: 224617799434108928n
    },
    echo: {
        name: "ECHO",
        id: 712639419785412668n
    },
    RyanCaoDev: {
        name: "RyanCaoDev",
        id: 952235800110694471n
    },
    HypedDomi: {
        name: "HypedDomi",
        id: 354191516979429376n
    },
    Grzesiek11: {
        name: "Grzesiek11",
        id: 368475654662127616n
    },
    Aria: {
        name: "Syncxv",
        id: 549244932213309442n
    },
    ProffDea: {
        name: "ProffDea",
        id: 609329952180928513n
    },
    HappyEnderman: {
        name: "Happy enderman",
        id: 1083437693347827764n
    },
    Nyako: {
        name: "nyako",
        id: 118437263754395652n
    },
    ant0n: {
        name: "ant0n",
        id: 145224646868860928n
    },
    MaiKokain: {
        name: "Mai",
        id: 722647978577363026n
    },
    Korbo: {
        name: "Korbo",
        id: 455856406420258827n
    },
    Moxxie: {
        name: "Moxxie",
        id: 712653921692155965n
    },
    arHSM: {
        name: "arHSM",
        id: 841509053422632990n
    },
    iamme: {
        name: "i am me",
        id: 984392761929256980n
    },
    creations: {
        name: "Creation's",
        id: 209830981060788225n
    },
    Leko: {
        name: "Leko",
        id: 108153734541942784n
    },
    SomeAspy: {
        name: "SomeAspy",
        id: 516750892372852754n
    },
    nvhhr: {
        name: "nvhhr",
        id: 165098921071345666n
    },
    Z1xus: {
        name: "Z1xus",
        id: 377450600797044746n
    },
    Oggetto: {
        name: "Oggetto",
        id: 619203349954166804n
    },
    zyqunix: {
        name: "zyqunix",
        id: 1201415921802170388n
    },
    examplegit: {
        name: "example.user",
        id: 175411535357673473n
    },
    Loukios: {
        name: "Loukios",
        id: 211461918127292416n
    },
    vappstar: {
        name: "vappstar",
        id: 747192967311261748n
    },
    voidbbg: {
        name: "voidbbg",
        id: 117126234588184582n
    },
    OIRNOIR: {
        name: "OIRNOIR",
        id: 720842469024989195n
    },
    mochienya: {
        name: "mochie",
        id: 1043599230247374869n,
    },
    okiso: {
        name: "okiso",
        id: 274178934143451137n,
    },
    port22exposed: {
        name: "port",
        id: 1318383159645311009n,
    },
    PhoenixAceVFX: {
        name: "PhoenixAceVFX",
        id: 1016895892055396484n,
    },
    TheArmagan: {
        name: "TheArmagan",
        id: 707309693449535599n
    },
    seth: {
        name: "S€th",
        id: 1273447359417942128n
    },
    SteelTech: {
        name: "SteelTech",
        id: 1344190786476183643n
    },
    talhakf: {
        name: "talhakf",
        id: 1140716160560676976n
    },
    xijexo: {
        name: "xijexo",
        id: 1284113557201620995n
    },
    omaw: {
        name: "omaw",
        id: 1155026301791514655n
    },
    WKoA: {
        name: "WKoA",
        id: 724416180097384498n
    },
    smuki: {
        name: "smuki",
        id: 691517398523576331n
    },
    ItsAlex: {
        name: "ItsAlex",
        id: 551023598203043840n
    },
    Byeoon: {
        name: "byeoon",
        id: 1167275288036655133n
    },
    Skully: {
        name: "Skully",
        id: 150298098516754432n
    },
    Buzzy: {
        name: "Buzzy",
        id: 1273353654644117585n
    },
    Reycko: {
        name: "Reycko",
        id: 1123725368004726794n,
    },
    Campfire: {
        name: "Campfire",
        id: 376414446840578081n,
    },
    Cootshk: {
        name: "Cootshk",
        id: 921605971577548820n,
    },
    sliwka: {
        name: "sliwka",
        id: 1165286199628419129n,
    },
    bbgaming25k: {
        name: "bbgaming25k",
        id: 851222385528274964n,
    },
    davidkra230: {
        name: "davidkra230",
        id: 652699312631054356n,
    },
    GroupXyz: {
        name: "GroupXyz",
        id: 950033410229944331n
    },
    Suffocate: {
        name: "Suffocate",
        id: 772601756776923187n
    },
    veygax: {
        name: "veygax",
        id: 1119938236245094521n
    },
    secp192k1: {
        name: "secp192k1",
        id: 477497542205243392n
    },
    VillainsRule: {
        name: "VillainsRule",
        id: 0n
    },
    Etorix: {
        name: "Etorix",
        id: 94597845868355584n,
    },
    Johannes7k75: {
        name: "Johannes7k75",
        id: 587701169103699994n
    },
    DiabeloDEV: {
        name: "DiabeloDEV",
        id: 1231342375465390100n
    },
    ryanamay: {
        name: "ryanamay",
        id: 1262793452236570667n
    },
    Mocha: {
        name: "Mocha",
        id: 808802000224518264n
    },
} satisfies Record<string, Dev>);

// iife so #__PURE__ works correctly
export const VencordDevsById = /* #__PURE__*/ (() =>
    Object.freeze(Object.fromEntries(
        Object.entries(Devs)
            .filter(d => d[1].id !== 0n)
            .map(([_, v]) => [v.id, v] as const)
    ))
)() as Record<string, Dev>;

export const EquicordDevsById = /* #__PURE__*/ (() =>
    Object.freeze(Object.fromEntries(
        Object.entries(EquicordDevs)
            .filter(d => d[1].id !== 0n)
            .map(([_, v]) => [v.id, v] as const)
    ))
)() as Record<string, Dev>;
