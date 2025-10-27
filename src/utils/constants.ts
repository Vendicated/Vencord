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
export const VENBOT_USER_ID = "1017176847865352332";
export const VENCORD_GUILD_ID = "1015060230222131221";
export const DONOR_ROLE_ID = "1042507929485586532";
export const CONTRIB_ROLE_ID = "1026534353167208489";
export const REGULAR_ROLE_ID = "1026504932959977532";
export const SUPPORT_CHANNEL_ID = "1026515880080842772";
export const SUPPORT_CATEGORY_ID = "1108135649699180705";
export const KNOWN_ISSUES_CHANNEL_ID = "1222936386626129920";

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
    "Alyxia": {
        "id": 952185386350829688n,
        "name": "Alyxia Sother"
    },
    "AndrewDLO": {
        "id": 434135504792059917n,
        "name": "Andrew-DLO"
    },
    "Antti": {
        "id": 312974985876471810n,
        "name": "Antti"
    },
    "Apexo": {
        "id": 228548952687902720n,
        "name": "Apexo"
    },
    "Aria": {
        "id": 549244932213309442n,
        "name": "Syncxv"
    },
    "Arjix": {
        "badge": false,
        "id": 674710789138939916n,
        "name": "ArjixWasTaken"
    },
    "Arrow": {
        "id": 958158495302176778n,
        "name": "arrow"
    },
    "AshtonMemer": {
        "id": 373657230530052099n,
        "name": "AshtonMemer"
    },
    "AutumnVN": {
        "id": 393694671383166998n,
        "name": "AutumnVN"
    },
    "Av32000": {
        "id": 593436735380127770n,
        "name": "Av32000"
    },
    "AverageReactEnjoyer": {
        "id": 1004904120056029256n,
        "name": "Average React Enjoyer"
    },
    "BanTheNons": {
        "id": 460478012794863637n,
        "name": "BanTheNons"
    },
    "BigDuck": {
        "id": 1024588272623681609n,
        "name": "BigDuck"
    },
    "Board": {
        "id": 285475344817848320n,
        "name": "BoardTM"
    },
    "Byeoon": {
        "id": 1167275288036655133n,
        "name": "byeoon"
    },
    "CatNoir": {
        "id": 260371016348336128n,
        "name": "CatNoir"
    },
    "Commandtechno": {
        "id": 296776625432035328n,
        "name": "Commandtechno"
    },
    "Cootshk": {
        "id": 921605971577548820n,
        "name": "Cootshk"
    },
    "Cyn": {
        "id": 150745989836308480n,
        "name": "Cynosphere"
    },
    "D3SOX": {
        "id": 201052085641281538n,
        "name": "D3SOX"
    },
    "Dolfies": {
        "id": 852892297661906993n,
        "name": "Dolfies"
    },
    "Ducko": {
        "id": 506482395269169153n,
        "name": "Ducko"
    },
    "DustyAngel47": {
        "id": 714583473804935238n,
        "name": "DustyAngel47"
    },
    "Dziurwa": {
        "id": 1001086404203389018n,
        "name": "Dziurwa"
    },
    "Elvyra": {
        "id": 708275751816003615n,
        "name": "Elvyra"
    },
    "Ethan": {
        "id": 721717126523781240n,
        "name": "Ethan"
    },
    "FieryFlames": {
        "id": 890228870559698955n,
        "name": "Fiery"
    },
    "GabiRP": {
        "id": 507955112027750401n,
        "name": "GabiRP"
    },
    "Glitch": {
        "id": 269567451199569920n,
        "name": "Glitchy"
    },
    "Grzesiek11": {
        "id": 368475654662127616n,
        "name": "Grzesiek11"
    },
    "HAHALOSAH": {
        "id": 903418691268513883n,
        "name": "HAHALOSAH"
    },
    "HappyEnderman": {
        "id": 1083437693347827764n,
        "name": "Happy enderman"
    },
    "HypedDomi": {
        "id": 354191516979429376n,
        "name": "HypedDomi"
    },
    "ImBanana": {
        "id": 635250116688871425n,
        "name": "Im_Banana"
    },
    "ImLvna": {
        "id": 799319081723232267n,
        "name": "lillith <3"
    },
    "Inbestigator": {
        "id": 761777382041714690n,
        "name": "Inbestigator"
    },
    "JacobTm": {
        "id": 302872992097107991n,
        "name": "Jacob.Tm"
    },
    "JohnyTheCarrot": {
        "id": 132819036282159104n,
        "name": "JohnyTheCarrot"
    },
    "Joona": {
        "id": 297410829589020673n,
        "name": "Joona"
    },
    "Justman10000": {
        "id": 591982034050744320n,
        "name": "Justman10000"
    },
    "Kaitlyn": {
        "id": 306158896630988801n,
        "name": "kaitlyn"
    },
    "KannaDev": {
        "id": 317728561106518019n,
        "name": "Kanna"
    },
    "KingFish": {
        "id": 499400512559382538n,
        "name": "King Fish"
    },
    "Kodarru": {
        "id": 785227396218748949n,
        "name": "Kodarru"
    },
    "Korbo": {
        "id": 455856406420258827n,
        "name": "Korbo"
    },
    "KraXen72": {
        "id": 379304073515499530n,
        "name": "KraXen72"
    },
    "Kylie": {
        "id": 721853658941227088n,
        "name": "Cookie"
    },
    "Kyuuhachi": {
        "id": 236588665420251137n,
        "name": "Kyuuhachi"
    },
    "Lexi": {
        "id": 506101469787717658n,
        "name": "Lexi"
    },
    "LordElias": {
        "id": 319460781567639554n,
        "name": "LordElias"
    },
    "Lumap": {
        "id": 585278686291427338n,
        "name": "Lumap"
    },
    "Luna": {
        "id": 821472922140803112n,
        "name": "Luny"
    },
    "MaiKokain": {
        "id": 722647978577363026n,
        "name": "Mai"
    },
    "Megu": {
        "id": 545581357812678656n,
        "name": "Megumin"
    },
    "Mopi": {
        "id": 1022189106614243350n,
        "name": "Mopi"
    },
    "Moxxie": {
        "id": 712653921692155965n,
        "name": "Moxxie"
    },
    "Nickyux": {
        "id": 427146305651998721n,
        "name": "Nickyux"
    },
    "Noxillio": {
        "id": 138616536502894592n,
        "name": "Noxillio"
    },
    "Nuckyz": {
        "id": 235834946571337729n,
        "name": "Nuckyz"
    },
    "Nyako": {
        "id": 118437263754395652n,
        "name": "nyako"
    },
    "Obsidian": {
        "id": 683171006717755446n,
        "name": "Obsidian"
    },
    "PandaNinjas": {
        "id": 455128749071925248n,
        "name": "PandaNinjas"
    },
    "PolisanTheEasyNick": {
        "id": 242305263313485825n,
        "name": "Oleh Polisan"
    },
    "ProffDea": {
        "id": 609329952180928513n,
        "name": "ProffDea"
    },
    "RamziAH": {
        "id": 1279957227612147747n,
        "name": "RamziAH"
    },
    "Remty": {
        "id": 335055032204656642n,
        "name": "Remty"
    },
    "Rini": {
        "id": 1079479184478441643n,
        "name": "Rini"
    },
    "RuiNtD": {
        "id": 157917665162297344n,
        "name": "RuiNtD"
    },
    "RuukuLada": {
        "id": 119705748346241027n,
        "name": "RuukuLada"
    },
    "RyanCaoDev": {
        "id": 952235800110694471n,
        "name": "RyanCaoDev"
    },
    "SammCheese": {
        "id": 372148345894076416n,
        "name": "Samm-Cheese"
    },
    "Samu": {
        "id": 702973430449832038n,
        "name": "Samu"
    },
    "Samwich": {
        "id": 976176454511509554n,
        "name": "Samwich"
    },
    "ScattrdBlade": {
        "id": 678007540608532491n,
        "name": "ScattrdBlade"
    },
    "SerStars": {
        "id": 861631850681729045n,
        "name": "SerStars"
    },
    "SomeAspy": {
        "id": 516750892372852754n,
        "name": "SomeAspy"
    },
    "Sqaaakoi": {
        "id": 259558259491340288n,
        "name": "Sqaaakoi"
    },
    "TheKodeToad": {
        "id": 706152404072267788n,
        "name": "TheKodeToad"
    },
    "TheSun": {
        "id": 406028027768733696n,
        "name": "sunnie"
    },
    "Trwy": {
        "id": 354427199023218689n,
        "name": "trey"
    },
    "Tyler": {
        "id": 143117463788191746n,
        "name": "\\\\GGTyler\\\\"
    },
    "Tyman": {
        "id": 487443883127472129n,
        "name": "Tyman"
    },
    "UlyssesZhan": {
        "id": 586808226058862623n,
        "name": "UlyssesZhan"
    },
    "UwUDev": {
        "id": 691413039156690994n,
        "name": "UwU"
    },
    "Vap": {
        "id": 454072114492866560n,
        "name": "Vap0r1ze"
    },
    "Ven": {
        "id": 343383572805058560n,
        "name": "V"
    },
    "Vishnya": {
        "id": 282541644484575233n,
        "name": "Vishnya"
    },
    "Xinto": {
        "id": 423915768191647755n,
        "name": "Xinto"
    },
    "Zerebos": {
        "id": 249746236008169473n,
        "name": "Zerebos"
    },
    "adryd": {
        "id": 0n,
        "name": "adryd"
    },
    "afn": {
        "id": 420043923822608384n,
        "name": "afn"
    },
    "amia": {
        "id": 142007603549962240n,
        "name": "amia"
    },
    "amy": {
        "id": 603229858612510720n,
        "name": "Amy"
    },
    "ant0n": {
        "id": 145224646868860928n,
        "name": "ant0n"
    },
    "arHSM": {
        "id": 841509053422632990n,
        "name": "arHSM"
    },
    "archeruwu": {
        "id": 160068695383736320n,
        "name": "archer_uwu"
    },
    "bb010g": {
        "id": 72791153467990016n,
        "name": "bb010g"
    },
    "blahajZip": {
        "id": 683954422241427471n,
        "name": "blahaj.zip"
    },
    "botato": {
        "id": 440990343899643943n,
        "name": "botato"
    },
    "captain": {
        "id": 347366054806159360n,
        "name": "Captain"
    },
    "carince": {
        "id": 818323528755314698n,
        "name": "carince"
    },
    "castdrian": {
        "id": 224617799434108928n,
        "name": "castdrian"
    },
    "cloudburst": {
        "id": 892128204150685769n,
        "name": "cloudburst"
    },
    "coolelectronics": {
        "id": 696392247205298207n,
        "name": "coolelectronics"
    },
    "dzshn": {
        "id": 310449948011528192n,
        "name": "dzshn"
    },
    "fawn": {
        "id": 336678828233588736n,
        "name": "fawn"
    },
    "goodbee": {
        "id": 658968552606400512n,
        "name": "goodbee"
    },
    "hunt": {
        "id": 222800179697287168n,
        "name": "hunt-g"
    },
    "jamesbt365": {
        "id": 158567567487795200n,
        "name": "jamesbt365"
    },
    "jewdev": {
        "id": 222369866529636353n,
        "name": "jewdev"
    },
    "juby": {
        "id": 324622488644616195n,
        "name": "Juby210"
    },
    "katlyn": {
        "id": 250322741406859265n,
        "name": "katlyn"
    },
    "kemo": {
        "id": 715746190813298788n,
        "name": "kemo"
    },
    "lewisakura": {
        "id": 96269247411400704n,
        "name": "lewisakura"
    },
    "maisymoe": {
        "id": 257109471589957632n,
        "name": "maisy"
    },
    "mantikafasi": {
        "id": 287555395151593473n,
        "name": "mantikafasi"
    },
    "nakoyasha": {
        "id": 222069018507345921n,
        "name": "nakoyasha"
    },
    "nea": {
        "id": 310702108997320705n,
        "name": "nea"
    },
    "nekohaxx": {
        "id": 1176270221628153886n,
        "name": "nekohaxx"
    },
    "newwares": {
        "id": 421405303951851520n,
        "name": "newwares"
    },
    "nick": {
        "badge": false,
        "id": 347884694408265729n,
        "name": "nick"
    },
    "niko": {
        "id": 341377368075796483n,
        "name": "niko"
    },
    "nin0dev": {
        "id": 886685857560539176n,
        "name": "nin0dev"
    },
    "nyx": {
        "id": 1207087393929171095n,
        "name": "verticalsync."
    },
    "outfoxxed": {
        "id": 837425748435796060n,
        "name": "outfoxxed"
    },
    "phil": {
        "id": 305288513941667851n,
        "name": "phil"
    },
    "philipbry": {
        "id": 554994003318276106n,
        "name": "philipbry"
    },
    "pointy": {
        "id": 99914384989519872n,
        "name": "pointy"
    },
    "puv": {
        "id": 469441552251355137n,
        "name": "puv"
    },
    "pylix": {
        "id": 492949202121261067n,
        "name": "pylix"
    },
    "rad": {
        "id": 610945092504780823n,
        "name": "rad"
    },
    "rae": {
        "id": 1398136199503282277n,
        "name": "rae"
    },
    "relitrix": {
        "id": 423165393901715456n,
        "name": "Relitrix"
    },
    "rushii": {
        "id": 295190422244950017n,
        "name": "rushii"
    },
    "sadan": {
        "id": 521819891141967883n,
        "name": "sadan"
    },
    "samsam": {
        "id": 400482410279469056n,
        "name": "samsam"
    },
    "skyevg": {
        "id": 1090310844283363348n,
        "name": "skyevg"
    },
    "surgedevs": {
        "id": 1084592643784331324n,
        "name": "Chloe"
    },
    "thororen": {
        "id": 848339671629299742n,
        "name": "thororen"
    },
    "whqwert": {
        "id": 586239091520176128n,
        "name": "whqwert"
    },
    "xocherry": {
        "id": 221288171013406720n,
        "name": "xocherry"
    },
    "zt": {
        "id": 289556910426816513n,
        "name": "zt"
    }
} satisfies Record<string, Dev>);

// iife so #__PURE__ works correctly
export const DevsById = /* #__PURE__*/ (() =>
    Object.freeze(Object.fromEntries(
        Object.entries(Devs)
            .filter(d => d[1].id !== 0n)
            .map(([_, v]) => [v.id, v] as const)
    ))
)() as Record<string, Dev>;