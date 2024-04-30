/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Plugins } from "Vencord";

import { HexToHSL } from "./utils";

export const colorVariables: string[] = [
    "brand-100",
    "brand-130",
    "brand-160",
    "brand-200",
    "brand-230",
    "brand-260",
    "brand-300",
    "brand-330",
    "brand-345",
    "brand-360",
    "brand-400",
    "brand-430",
    "brand-460",
    "brand-500",
    "brand-530",
    "brand-560",
    "brand-600",
    "brand-630",
    "brand-660",
    "brand-700",
    "brand-730",
    "brand-760",
    "brand-800",
    "brand-830",
    "brand-860",
    "brand-900",
    "primary-900",
    "primary-860",
    "primary-830",
    "primary-800",
    "primary-760",
    "primary-730",
    "primary-700",
    "primary-660",
    "primary-645",
    "primary-630",
    "primary-600",
    "primary-560",
    "primary-530",
    "primary-500",
    "primary-460",
    "primary-430",
    "primary-400",
    "primary-360",
    "primary-330",
    "primary-300",
    "primary-260",
    "primary-230",
    "primary-200",
    "primary-160",
    "primary-130",
    "primary-100",
    "white-900",
    "white-860",
    "white-830",
    "white-800",
    "white-760",
    "white-730",
    "white-700",
    "white-660",
    "white-630",
    "white-600",
    "white-560",
    "white-530",
    "white-500",
    "white-460",
    "white-430",
    "white-400",
    "white-360",
    "white-330",
    "white-300",
    "white-260",
    "white-230",
    "white-200",
    "white-160",
    "white-130",
    "white-100",
    "teal-900",
    "teal-860",
    "teal-830",
    "teal-800",
    "teal-760",
    "teal-730",
    "teal-700",
    "teal-660",
    "teal-630",
    "teal-600",
    "teal-560",
    "teal-530",
    "teal-500",
    "teal-460",
    "teal-430",
    "teal-400",
    "teal-360",
    "teal-330",
    "teal-300",
    "teal-260",
    "teal-230",
    "teal-200",
    "teal-160",
    "teal-130",
    "teal-100",
    "black-900",
    "black-860",
    "black-830",
    "black-800",
    "black-760",
    "black-730",
    "black-700",
    "black-660",
    "black-630",
    "black-600",
    "black-560",
    "black-530",
    "black-500",
    "black-460",
    "black-430",
    "black-400",
    "black-360",
    "black-330",
    "black-300",
    "black-260",
    "black-230",
    "black-200",
    "black-160",
    "black-130",
    "black-100",
    "red-900",
    "red-860",
    "red-830",
    "red-800",
    "red-760",
    "red-730",
    "red-700",
    "red-660",
    "red-630",
    "red-600",
    "red-560",
    "red-530",
    "red-500",
    "red-460",
    "red-430",
    "red-400",
    "red-360",
    "red-330",
    "red-300",
    "red-260",
    "red-230",
    "red-200",
    "red-160",
    "red-130",
    "red-100",
    "yellow-900",
    "yellow-860",
    "yellow-830",
    "yellow-800",
    "yellow-760",
    "yellow-730",
    "yellow-700",
    "yellow-660",
    "yellow-630",
    "yellow-600",
    "yellow-560",
    "yellow-530",
    "yellow-500",
    "yellow-460",
    "yellow-430",
    "yellow-400",
    "yellow-360",
    "yellow-330",
    "yellow-300",
    "yellow-260",
    "yellow-230",
    "yellow-200",
    "yellow-160",
    "yellow-130",
    "yellow-100",
    "green-900",
    "green-860",
    "green-830",
    "green-800",
    "green-760",
    "green-730",
    "green-700",
    "green-660",
    "green-630",
    "green-600",
    "green-560",
    "green-530",
    "green-500",
    "green-460",
    "green-430",
    "green-400",
    "green-360",
    "green-330",
    "green-300",
    "green-260",
    "green-230",
    "green-200",
    "green-160",
    "green-130",
    "green-100",
];

const PrimarySatDiffs = {
    130: 63.9594,
    160: 49.4382,
    200: 37.5758,
    230: 30.3797,
    260: 22.5166,
    300: 32.5,
    330: 27.0968,
    345: 22.5166,
    360: 18.9189,
    400: -14.4,
    430: -33.0435,
    460: 25.2101,
    500: -11.0236,
    530: -3.0303,
    645: 7.40741,
    660: 3.0303,
    730: 11.9403,
    800: 25,
};

const BrandSatDiffs = {
    100: -9.54712,
    130: 2.19526,
    160: -1.17509,
    200: -2.72351,
    230: 1.62225,
    260: 0.698487,
    300: 0.582411,
    330: -0.585823,
    345: -0.468384,
    360: 0.582411,
    400: 0.582411,
    430: 0.116754,
    460: -0.116891,
    530: -24.8194,
    560: -49.927,
    600: -58.8057,
    630: -58.8057,
    660: -58.0256,
    700: -58.2202,
    730: -58.6103,
    760: -58.4151,
    800: -57.2502,
    830: -57.4436,
    860: -58.4151,
    900: -52.5074
};

const BrandLightDiffs = {
    100: 33.5,
    130: 32.2,
    160: 30.2,
    200: 28.2,
    230: 26.2999,
    260: 23.8999,
    300: 21.2,
    330: 16.8999,
    345: 14.0999,
    360: 12.7999,
    400: 7.0999,
    430: 5.0999,
    460: 2.7999,
    530: -5.9,
    560: -12.3,
    600: -20.6,
    630: -26.5,
    660: -31.4,
    700: -38.8,
    730: -40.4,
    760: -42.5,
    800: -45.3,
    830: -49.8,
    860: -55.1,
    900: -61.6
};

export const pureGradientBase = `
.theme-dark :is(.colorwaysPreview-modal, .colorwaysPreview-wrapper) {
    --dc-overlay-color: 0 0 0;
    --dc-overlay-color-inverse: 255 255 255;
    --dc-overlay-opacity-1: 0.85;
    --dc-overlay-opacity-2: 0.8;
    --dc-overlay-opacity-3: 0.7;
    --dc-overlay-opacity-4: 0.5;
    --dc-overlay-opacity-5: 0.4;
    --dc-overlay-opacity-6: 0.1;
    --dc-overlay-opacity-hover: 0.5;
    --dc-overlay-opacity-hover-inverse: 0.08;
    --dc-overlay-opacity-active: 0.45;
    --dc-overlay-opacity-active-inverse: 0.1;
    --dc-overlay-opacity-selected: 0.4;
    --dc-overlay-opacity-selected-inverse: 0.15;
    --dc-overlay-opacity-chat: 0.8;
    --dc-overlay-opacity-home: 0.85;
    --dc-overlay-opacity-home-card: 0.8;
    --dc-overlay-opacity-app-frame: var(--dc-overlay-opacity-4);
    --dc-guild-button: rgb(var(--dc-overlay-color-inverse)/var(--dc-overlay-opacity-6));
    --dc-secondary-alt: linear-gradient(rgb(var(--dc-overlay-color)/var(--dc-overlay-opacity-3)),rgb(var(--dc-overlay-color)/var(--dc-overlay-opacity-3))) fixed 0 0/cover,var(--gradient-theme-bg) fixed 0 0/cover;
    --dc-chat-header: linear-gradient(rgb(var(--dc-overlay-color)/var(--dc-overlay-opacity-2)),rgb(var(--dc-overlay-color)/var(--dc-overlay-opacity-2))) fixed 0 0/cover,var(--gradient-theme-bg) fixed 0 0/cover;
}
.theme-light :is(.colorwaysPreview-modal, .colorwaysPreview-wrapper) {
    --dc-overlay-color: 255 255 255;
    --dc-overlay-color-inverse: 0 0 0;
    --dc-overlay-opacity-1: 0.9;
    --dc-overlay-opacity-2: 0.8;
    --dc-overlay-opacity-3: 0.7;
    --dc-overlay-opacity-4: 0.6;
    --dc-overlay-opacity-5: 0.3;
    --dc-overlay-opacity-6: 0.15;
    --dc-overlay-opacity-hover: 0.7;
    --dc-overlay-opacity-hover-inverse: 0.02;
    --dc-overlay-opacity-active: 0.65;
    --dc-overlay-opacity-active-inverse: 0.03;
    --dc-overlay-opacity-selected: 0.6;
    --dc-overlay-opacity-selected-inverse: 0.04;
    --dc-overlay-opacity-chat: 0.9;
    --dc-overlay-opacity-home: 0.7;
    --dc-overlay-opacity-home-card: 0.9;
    --dc-overlay-opacity-app-frame: var(--dc-overlay-opacity-5);
    --dc-guild-button: rgb(var(--dc-overlay-color)/var(--dc-overlay-opacity-3));
    --dc-secondary-alt: linear-gradient(rgb(var(--dc-overlay-color)/var(--dc-overlay-opacity-1)),rgb(var(--dc-overlay-color)/var(--dc-overlay-opacity-1))) fixed 0 0/cover,var(--gradient-theme-bg) fixed 0 0/cover;
    --dc-chat-header: linear-gradient(rgb(var(--dc-overlay-color)/var(--dc-overlay-opacity-1)),rgb(var(--dc-overlay-color)/var(--dc-overlay-opacity-1))) fixed 0 0/cover,var(--gradient-theme-bg) fixed 0 0/cover;
}
.colorwaysPreview-modal,
.colorwaysPreview-wrapper {
    --dc-overlay-1: linear-gradient(rgb(var(--dc-overlay-color)/var(--dc-overlay-opacity-1)),rgb(var(--dc-overlay-color)/var(--dc-overlay-opacity-1))) fixed 0 0/cover,var(--gradient-theme-bg) fixed 0 0/cover;
    --dc-overlay-2: linear-gradient(rgb(var(--dc-overlay-color)/var(--dc-overlay-opacity-2)),rgb(var(--dc-overlay-color)/var(--dc-overlay-opacity-2))) fixed 0 0/cover,var(--gradient-theme-bg) fixed 0 0/cover;
    --dc-overlay-3: linear-gradient(rgb(var(--dc-overlay-color)/var(--dc-overlay-opacity-3)),rgb(var(--dc-overlay-color)/var(--dc-overlay-opacity-3))) fixed 0 0/cover,var(--gradient-theme-bg) fixed 0 0/cover;
    --dc-overlay-4: linear-gradient(rgb(var(--dc-overlay-color)/var(--dc-overlay-opacity-4)),rgb(var(--dc-overlay-color)/var(--dc-overlay-opacity-4))) fixed 0 0/cover,var(--gradient-theme-bg) fixed 0 0/cover;
    --dc-overlay-5: linear-gradient(rgb(var(--dc-overlay-color)/var(--dc-overlay-opacity-5)),rgb(var(--dc-overlay-color)/var(--dc-overlay-opacity-5))) fixed 0 0/cover,var(--gradient-theme-bg) fixed 0 0/cover;
    --dc-overlay-6: linear-gradient(rgb(var(--dc-overlay-color-inverse)/var(--dc-overlay-opacity-6)),rgb(var(--dc-overlay-color-inverse)/var(--dc-overlay-opacity-6))) fixed 0 0/cover,var(--gradient-theme-bg) fixed 0 0/cover;
    --dc-overlay-hover: linear-gradient(rgb(var(--dc-overlay-color-inverse)/var(--dc-overlay-opacity-hover-inverse)),rgb(var(--dc-overlay-color-inverse)/var(--dc-overlay-opacity-hover-inverse))) fixed 0 0/cover,linear-gradient(rgb(var(--dc-overlay-color)/var(--dc-overlay-opacity-hover)),rgb(var(--dc-overlay-color)/var(--dc-overlay-opacity-hover))) fixed 0 0/cover,var(--gradient-theme-bg) fixed 0 0/cover;
    --dc-overlay-active: linear-gradient(rgb(var(--dc-overlay-color-inverse)/var(--dc-overlay-opacity-active-inverse)),rgb(var(--dc-overlay-color-inverse)/var(--dc-overlay-opacity-active-inverse))) fixed 0 0/cover,linear-gradient(rgb(var(--dc-overlay-color)/var(--dc-overlay-opacity-active)),rgb(var(--dc-overlay-color)/var(--dc-overlay-opacity-active))) fixed 0 0/cover,var(--gradient-theme-bg) fixed 0 0/cover;
    --dc-overlay-selected: linear-gradient(rgb(var(--dc-overlay-color-inverse)/var(--dc-overlay-opacity-selected-inverse)),rgb(var(--dc-overlay-color-inverse)/var(--dc-overlay-opacity-selected-inverse))) fixed 0 0/cover,linear-gradient(rgb(var(--dc-overlay-color)/var(--dc-overlay-opacity-selected)),rgb(var(--dc-overlay-color)/var(--dc-overlay-opacity-selected))) fixed 0 0/cover,var(--gradient-theme-bg) fixed 0 0/cover;
    --dc-overlay-chat: linear-gradient(rgb(var(--dc-overlay-color)/var(--dc-overlay-opacity-chat)),rgb(var(--dc-overlay-color)/var(--dc-overlay-opacity-chat))) fixed 0 0/cover,var(--gradient-theme-bg) fixed 0 0/cover;
    --dc-overlay-home: linear-gradient(rgb(var(--dc-overlay-color)/var(--dc-overlay-opacity-home)),rgb(var(--dc-overlay-color)/var(--dc-overlay-opacity-home))) fixed 0 0/cover,var(--gradient-theme-bg) fixed 0 0/cover;
    --dc-overlay-home-card: linear-gradient(rgb(var(--dc-overlay-color)/var(--dc-overlay-opacity-home-card)),rgb(var(--dc-overlay-color)/var(--dc-overlay-opacity-home-card))) fixed 0 0/cover,var(--gradient-theme-bg) fixed 0 0/cover;
    --dc-overlay-app-frame: linear-gradient(rgb(var(--dc-overlay-color)/var(--dc-overlay-opacity-app-frame)),rgb(var(--dc-overlay-color)/var(--dc-overlay-opacity-app-frame))) fixed 0 0/cover,var(--gradient-theme-bg) fixed 0 0/cover;
}`;


export function gradientBase(accentColor?: string, discordSaturation = false) {
    return `@import url(//dablulite.github.io/css-snippets/NitroThemesFix/import.css);
.theme-dark {
    --bg-overlay-color: 0 0 0;
    --bg-overlay-color-inverse: 255 255 255;
    --bg-overlay-opacity-1: 0.85;
    --bg-overlay-opacity-2: 0.8;
    --bg-overlay-opacity-3: 0.7;
    --bg-overlay-opacity-4: 0.5;
    --bg-overlay-opacity-5: 0.4;
    --bg-overlay-opacity-6: 0.1;
    --bg-overlay-opacity-hover: 0.5;
    --bg-overlay-opacity-hover-inverse: 0.08;
    --bg-overlay-opacity-active: 0.45;
    --bg-overlay-opacity-active-inverse: 0.1;
    --bg-overlay-opacity-selected: 0.4;
    --bg-overlay-opacity-selected-inverse: 0.15;
    --bg-overlay-opacity-chat: 0.8;
    --bg-overlay-opacity-home: 0.85;
    --bg-overlay-opacity-home-card: 0.8;
    --bg-overlay-opacity-app-frame: var(--bg-overlay-opacity-4);
}
.theme-light {
    --bg-overlay-color: 255 255 255;
    --bg-overlay-color-inverse: 0 0 0;
    --bg-overlay-opacity-1: 0.9;
    --bg-overlay-opacity-2: 0.8;
    --bg-overlay-opacity-3: 0.7;
    --bg-overlay-opacity-4: 0.6;
    --bg-overlay-opacity-5: 0.3;
    --bg-overlay-opacity-6: 0.15;
    --bg-overlay-opacity-hover: 0.7;
    --bg-overlay-opacity-hover-inverse: 0.02;
    --bg-overlay-opacity-active: 0.65;
    --bg-overlay-opacity-active-inverse: 0.03;
    --bg-overlay-opacity-selected: 0.6;
    --bg-overlay-opacity-selected-inverse: 0.04;
    --bg-overlay-opacity-chat: 0.9;
    --bg-overlay-opacity-home: 0.7;
    --bg-overlay-opacity-home-card: 0.9;
    --bg-overlay-opacity-app-frame: var(--bg-overlay-opacity-5);
}
.children_cde9af:after, .form_d8a4a1:before {
    content: none;
}
.scroller_de945b {
    background: var(--bg-overlay-app-frame,var(--background-tertiary));
}
.expandedFolderBackground_b1385f {
    background: rgb(var(--bg-overlay-color-inverse)/var(--bg-overlay-opacity-6));
}
.wrapper__8436d:not(:hover):not(.selected_ae80f7) .childWrapper_a6ce15 {
    background: rgb(var(--bg-overlay-color-inverse)/var(--bg-overlay-opacity-6));
}
.folder__17546:has(.expandedFolderIconWrapper__324c1) {
    background: var(--bg-overlay-6,var(--background-secondary));
}
.circleIconButton__05cf2:not(.selected_aded59) {
    background: rgb(var(--bg-overlay-color-inverse)/var(--bg-overlay-opacity-6));
}
.auto_a3c0bd::-webkit-scrollbar-thumb,
.thin_b1c063::-webkit-scrollbar-thumb {
    background-size: 200vh;
    background-image: -webkit-gradient(linear,left top,left bottom,from(rgb(var(--bg-overlay-color-inverse)/var(--bg-overlay-opacity-4))),to(rgb(var(--bg-overlay-color-inverse)/var(--bg-overlay-opacity-4)))),var(--custom-theme-background);
    background-image: linear-gradient(rgb(var(--bg-overlay-color-inverse)/var(--bg-overlay-opacity-4)),rgb(var(--bg-overlay-color-inverse)/var(--bg-overlay-opacity-4))),var(--custom-theme-background);
}
.auto_a3c0bd::-webkit-scrollbar-track {
    background-size: 200vh;
    background-image: -webkit-gradient(linear,left top,left bottom,from(rgb(var(--bg-overlay-color)/.4)),to(rgb(var(--bg-overlay-color)/.4))),var(--custom-theme-background);
    background-image: linear-gradient(rgb(var(--bg-overlay-color)/.4),rgb(var(--bg-overlay-color)/.4)),var(--custom-theme-background);
}
:root:root {
    --brand-100-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[100])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[100]) * 10) / 10, 0)};
    --brand-130-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[130])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[130]) * 10) / 10, 0)}%;
    --brand-160-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[160])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[160]) * 10) / 10, 0)}%;
    --brand-200-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[200])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[200]) * 10) / 10, 0)}%;
    --brand-230-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[230])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[230]) * 10) / 10, 0)}%;
    --brand-260-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[260])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[260]) * 10) / 10, 0)}%;
    --brand-300-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[300])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[300]) * 10) / 10, 0)}%;
    --brand-330-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[330])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[330]) * 10) / 10, 0)}%;
    --brand-345-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[345])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[345]) * 10) / 10, 0)}%;
    --brand-360-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[360])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[360]) * 10) / 10, 0)}%;
    --brand-400-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[400])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[400]) * 10) / 10, 0)}%;
    --brand-430-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[430])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[430]) * 10) / 10, 0)}%;
    --brand-460-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[460])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[460]) * 10) / 10, 0)}%;
    --brand-500-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${HexToHSL("#" + accentColor)[2]}%;
    --brand-530-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[530])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[530]) * 10) / 10, 100)}%;
    --brand-560-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[560])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[560]) * 10) / 10, 100)}%;
    --brand-600-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[600])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[600]) * 10) / 10, 100)}%;
    --brand-630-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[630])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[630]) * 10) / 10, 100)}%;
    --brand-660-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[660])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[660]) * 10) / 10, 100)}%;
    --brand-700-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[700])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[700]) * 10) / 10, 100)}%;
    --brand-730-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[730])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[730]) * 10) / 10, 100)}%;
    --brand-760-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[760])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[760]) * 10) / 10, 100)}%;
    --brand-800-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[800])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[800]) * 10) / 10, 100)}%;
    --brand-830-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[830])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[830]) * 10) / 10, 100)}%;
    --brand-860-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[860])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[860]) * 10) / 10, 100)}%;
    --brand-900-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[900])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[900]) * 10) / 10, 100)}%;
    --bg-overlay-1: linear-gradient(rgb(var(--bg-overlay-color)/var(--bg-overlay-opacity-1)),rgb(var(--bg-overlay-color)/var(--bg-overlay-opacity-1))) fixed 0 0/cover,var(--custom-theme-background) fixed 0 0/cover;
    --bg-overlay-2: linear-gradient(rgb(var(--bg-overlay-color)/var(--bg-overlay-opacity-2)),rgb(var(--bg-overlay-color)/var(--bg-overlay-opacity-2))) fixed 0 0/cover,var(--custom-theme-background) fixed 0 0/cover;
    --bg-overlay-3: linear-gradient(rgb(var(--bg-overlay-color)/var(--bg-overlay-opacity-3)),rgb(var(--bg-overlay-color)/var(--bg-overlay-opacity-3))) fixed 0 0/cover,var(--custom-theme-background) fixed 0 0/cover;
    --bg-overlay-4: linear-gradient(rgb(var(--bg-overlay-color)/var(--bg-overlay-opacity-4)),rgb(var(--bg-overlay-color)/var(--bg-overlay-opacity-4))) fixed 0 0/cover,var(--custom-theme-background) fixed 0 0/cover;
    --bg-overlay-5: linear-gradient(rgb(var(--bg-overlay-color)/var(--bg-overlay-opacity-5)),rgb(var(--bg-overlay-color)/var(--bg-overlay-opacity-5))) fixed 0 0/cover,var(--custom-theme-background) fixed 0 0/cover;
    --bg-overlay-6: linear-gradient(rgb(var(--bg-overlay-color-inverse)/var(--bg-overlay-opacity-6)),rgb(var(--bg-overlay-color-inverse)/var(--bg-overlay-opacity-6))) fixed 0 0/cover,var(--custom-theme-background) fixed 0 0/cover;
    --bg-overlay-hover: linear-gradient(rgb(var(--bg-overlay-color-inverse)/var(--bg-overlay-opacity-hover-inverse)),rgb(var(--bg-overlay-color-inverse)/var(--bg-overlay-opacity-hover-inverse))) fixed 0 0/cover,linear-gradient(rgb(var(--bg-overlay-color)/var(--bg-overlay-opacity-hover)),rgb(var(--bg-overlay-color)/var(--bg-overlay-opacity-hover))) fixed 0 0/cover,var(--custom-theme-background) fixed 0 0/cover;
    --bg-overlay-active: linear-gradient(rgb(var(--bg-overlay-color-inverse)/var(--bg-overlay-opacity-active-inverse)),rgb(var(--bg-overlay-color-inverse)/var(--bg-overlay-opacity-active-inverse))) fixed 0 0/cover,linear-gradient(rgb(var(--bg-overlay-color)/var(--bg-overlay-opacity-active)),rgb(var(--bg-overlay-color)/var(--bg-overlay-opacity-active))) fixed 0 0/cover,var(--custom-theme-background) fixed 0 0/cover;
    --bg-overlay-selected: linear-gradient(rgb(var(--bg-overlay-color-inverse)/var(--bg-overlay-opacity-selected-inverse)),rgb(var(--bg-overlay-color-inverse)/var(--bg-overlay-opacity-selected-inverse))) fixed 0 0/cover,linear-gradient(rgb(var(--bg-overlay-color)/var(--bg-overlay-opacity-selected)),rgb(var(--bg-overlay-color)/var(--bg-overlay-opacity-selected))) fixed 0 0/cover,var(--custom-theme-background) fixed 0 0/cover;
    --bg-overlay-chat: linear-gradient(rgb(var(--bg-overlay-color)/var(--bg-overlay-opacity-chat)),rgb(var(--bg-overlay-color)/var(--bg-overlay-opacity-chat))) fixed 0 0/cover,var(--custom-theme-background) fixed 0 0/cover;
    --bg-overlay-home: linear-gradient(rgb(var(--bg-overlay-color)/var(--bg-overlay-opacity-home)),rgb(var(--bg-overlay-color)/var(--bg-overlay-opacity-home))) fixed 0 0/cover,var(--custom-theme-background) fixed 0 0/cover;
    --bg-overlay-home-card: linear-gradient(rgb(var(--bg-overlay-color)/var(--bg-overlay-opacity-home-card)),rgb(var(--bg-overlay-color)/var(--bg-overlay-opacity-home-card))) fixed 0 0/cover,var(--custom-theme-background) fixed 0 0/cover;
    --bg-overlay-app-frame: linear-gradient(rgb(var(--bg-overlay-color)/var(--bg-overlay-opacity-app-frame)),rgb(var(--bg-overlay-color)/var(--bg-overlay-opacity-app-frame))) fixed 0 0/cover,var(--custom-theme-background) fixed 0 0/cover;
}`;
}

export function getAutoPresets(accentColor?: string) {
    function hueRotation() {
        return `:root:root {
    --brand-100-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[100]) * 10) / 10, 0)};
    --brand-130-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[130]) * 10) / 10, 0)}%;
    --brand-160-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[160]) * 10) / 10, 0)}%;
    --brand-200-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[200]) * 10) / 10, 0)}%;
    --brand-230-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[230]) * 10) / 10, 0)}%;
    --brand-260-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[260]) * 10) / 10, 0)}%;
    --brand-300-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[300]) * 10) / 10, 0)}%;
    --brand-330-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[330]) * 10) / 10, 0)}%;
    --brand-345-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[345]) * 10) / 10, 0)}%;
    --brand-360-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[360]) * 10) / 10, 0)}%;
    --brand-400-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[400]) * 10) / 10, 0)}%;
    --brand-430-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[430]) * 10) / 10, 0)}%;
    --brand-460-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[460]) * 10) / 10, 0)}%;
    --brand-500-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${HexToHSL("#" + accentColor)[2]}%;
    --brand-530-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[530]) * 10) / 10, 100)}%;
    --brand-560-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[560]) * 10) / 10, 100)}%;
    --brand-600-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[600]) * 10) / 10, 100)}%;
    --brand-630-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[630]) * 10) / 10, 100)}%;
    --brand-660-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[660]) * 10) / 10, 100)}%;
    --brand-700-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[700]) * 10) / 10, 100)}%;
    --brand-730-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[730]) * 10) / 10, 100)}%;
    --brand-760-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[760]) * 10) / 10, 100)}%;
    --brand-800-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[800]) * 10) / 10, 100)}%;
    --brand-830-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[830]) * 10) / 10, 100)}%;
    --brand-860-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[860]) * 10) / 10, 100)}%;
    --brand-900-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[900]) * 10) / 10, 100)}%;
    --primary-800-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*12%) 7%;
    --primary-730-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*10%) 13%;
    --primary-700-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*10%) 13%;
    --primary-660-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*11%) 15%;
    --primary-645-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*11%) 16%;
    --primary-630-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*11%) 18%;
    --primary-600-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*11%) 21%;
    --primary-560-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*11%) 24%;
    --primary-530-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*11%) 24%;
    --primary-500-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*11%) 24%;
}`;
    }

    function accentSwap() {
        return `:root:root {
    --brand-100-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[100]) * 10) / 10, 0)};
    --brand-130-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[130]) * 10) / 10, 0)}%;
    --brand-160-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[160]) * 10) / 10, 0)}%;
    --brand-200-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[200]) * 10) / 10, 0)}%;
    --brand-230-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[230]) * 10) / 10, 0)}%;
    --brand-260-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[260]) * 10) / 10, 0)}%;
    --brand-300-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[300]) * 10) / 10, 0)}%;
    --brand-330-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[330]) * 10) / 10, 0)}%;
    --brand-345-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[345]) * 10) / 10, 0)}%;
    --brand-360-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[360]) * 10) / 10, 0)}%;
    --brand-400-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[400]) * 10) / 10, 0)}%;
    --brand-430-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[430]) * 10) / 10, 0)}%;
    --brand-460-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[460]) * 10) / 10, 0)}%;
    --brand-500-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${HexToHSL("#" + accentColor)[2]}%;
    --brand-530-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[530]) * 10) / 10, 100)}%;
    --brand-560-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[560]) * 10) / 10, 100)}%;
    --brand-600-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[600]) * 10) / 10, 100)}%;
    --brand-630-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[630]) * 10) / 10, 100)}%;
    --brand-660-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[660]) * 10) / 10, 100)}%;
    --brand-700-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[700]) * 10) / 10, 100)}%;
    --brand-730-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[730]) * 10) / 10, 100)}%;
    --brand-760-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[760]) * 10) / 10, 100)}%;
    --brand-800-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[800]) * 10) / 10, 100)}%;
    --brand-830-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[830]) * 10) / 10, 100)}%;
    --brand-860-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[860]) * 10) / 10, 100)}%;
    --brand-900-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[900]) * 10) / 10, 100)}%;
}`;
    }

    function materialYou() {
        return `:root:root {
    --brand-100-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*90.5%) 56.5;
    --brand-130-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*102.2%) 55.2%;
    --brand-160-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*98.8%) 53.2%;
    --brand-200-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*97.3%) 51.2%;
    --brand-230-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*101.6%) 49.3%;
    --brand-260-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*100.7%) 46.9%;
    --brand-300-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*100.6%) 44.2%;
    --brand-330-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*99.4%) 39.9%;
    --brand-345-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*99.5%) 37.1%;
    --brand-360-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*100.6%) 35.8%;
    --brand-400-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*100.6%) 30.1%;
    --brand-430-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*100.1%) 28.1%;
    --brand-460-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*99.9%) 25.8%;
    --brand-500-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*100%) 23%;
    --brand-530-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*75.2%) 17.1%;
    --brand-560-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*50.1%) 10.7%;
    --brand-600-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*41.2%) 2.4%;
    --brand-630-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*41.2%) -3.5%;
    --brand-660-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*42%) -8.4%;
    --brand-700-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*41.8%) -15.8%;
    --brand-730-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*41.4%) -17.4%;
    --brand-760-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*41.6%) -19.5%;
    --brand-800-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*42.7%) -22.3%;
    --brand-830-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*42.6%) -26.8%;
    --brand-860-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*41.6%) -32.1%;
    --brand-900-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*47.5%) -38.6%;
    --primary-800-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*10%) 10.8%;
    --primary-730-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*8%) 14.4%;
    --primary-700-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*16%) 18%;
    --primary-660-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*14%) 12.4%;
    --primary-645-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*14%) 14.9%;
    --primary-630-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*12%) 16%;
    --primary-600-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*12%) 12%;
    --primary-560-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*12%) 15.6%;
    --primary-530-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*12%) 19.2%;
    --primary-500-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*12%) 22.8%;
    --primary-460-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*12%) 50%;
    --primary-430: hsl(${HexToHSL("#" + accentColor)[0]}, calc(var(--saturation-factor, 1)*12%), 90%);
    --primary-400: hsl(${HexToHSL("#" + accentColor)[0]}, calc(var(--saturation-factor, 1)*12%), 90%);
    --primary-360: hsl(${HexToHSL("#" + accentColor)[0]}, calc(var(--saturation-factor, 1)*12%), 90%);
}
.emptyPage_feb902,
.scrollerContainer_dda72c,
.container__03ec9,
.header__71942 {
    background-color: unset !important;
}`;
    }

    return {
        hueRotation: {
            name: "Hue Rotation",
            id: "hueRotation",
            preset: hueRotation
        },
        accentSwap: {
            name: "Accent Swap",
            id: "accentSwap",
            preset: accentSwap
        },
        materialYou: {
            name: "Material You",
            id: "materialYou",
            preset: materialYou
        }
    } as { [key: string]: { name: string, id: string, preset: () => string; }; };
}

export function generateCss(primaryColor: string, secondaryColor: string, tertiaryColor: string, accentColor: string, tintedText: boolean, discordSaturation: boolean) {
    return `/*Automatically Generated - Colorway Creator V${(Plugins.plugins.DiscordColorways as any).creatorVersion}*/
:root:root {
    --brand-100-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[100])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[100]) * 10) / 10, 0)};
    --brand-130-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[130])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[130]) * 10) / 10, 0)}%;
    --brand-160-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[160])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[160]) * 10) / 10, 0)}%;
    --brand-200-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[200])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[200]) * 10) / 10, 0)}%;
    --brand-230-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[230])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[230]) * 10) / 10, 0)}%;
    --brand-260-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[260])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[260]) * 10) / 10, 0)}%;
    --brand-300-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[300])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[300]) * 10) / 10, 0)}%;
    --brand-330-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[330])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[330]) * 10) / 10, 0)}%;
    --brand-345-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[345])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[345]) * 10) / 10, 0)}%;
    --brand-360-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[360])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[360]) * 10) / 10, 0)}%;
    --brand-400-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[400])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[400]) * 10) / 10, 0)}%;
    --brand-430-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[430])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[430]) * 10) / 10, 0)}%;
    --brand-460-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[460])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[460]) * 10) / 10, 0)}%;
    --brand-500-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${HexToHSL("#" + accentColor)[2]}%;
    --brand-530-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[530])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[530]) * 10) / 10, 100)}%;
    --brand-560-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[560])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[560]) * 10) / 10, 100)}%;
    --brand-600-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[600])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[600]) * 10) / 10, 100)}%;
    --brand-630-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[630])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[630]) * 10) / 10, 100)}%;
    --brand-660-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[660])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[660]) * 10) / 10, 100)}%;
    --brand-700-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[700])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[700]) * 10) / 10, 100)}%;
    --brand-730-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[730])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[730]) * 10) / 10, 100)}%;
    --brand-760-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[760])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[760]) * 10) / 10, 100)}%;
    --brand-800-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[800])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[800]) * 10) / 10, 100)}%;
    --brand-830-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[830])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[830]) * 10) / 10, 100)}%;
    --brand-860-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[860])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[860]) * 10) / 10, 100)}%;
    --brand-900-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[900])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[900]) * 10) / 10, 100)}%;
    --primary-800-hsl: ${HexToHSL("#" + tertiaryColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + tertiaryColor)[1] / 100) * (100 + PrimarySatDiffs[800])) * 10) / 10 : HexToHSL("#" + tertiaryColor)[1]}%) ${Math.max(HexToHSL("#" + tertiaryColor)[2] - (3.6 * 2), 0)}%;
    --primary-730-hsl: ${HexToHSL("#" + tertiaryColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + tertiaryColor)[1] / 100) * (100 + PrimarySatDiffs[730])) * 10) / 10 : HexToHSL("#" + tertiaryColor)[1]}%) ${Math.max(HexToHSL("#" + tertiaryColor)[2] - 3.6, 0)}%;
    --primary-700-hsl: ${HexToHSL("#" + tertiaryColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + tertiaryColor)[1]}%) ${HexToHSL("#" + tertiaryColor)[2]}%;
    --primary-660-hsl: ${HexToHSL("#" + secondaryColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + secondaryColor)[1] / 100) * (100 + PrimarySatDiffs[660])) * 10) / 10 : HexToHSL("#" + secondaryColor)[1]}%) ${Math.max(HexToHSL("#" + secondaryColor)[2] - 3.6, 0)}%;
    --primary-645-hsl: ${HexToHSL("#" + secondaryColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + secondaryColor)[1] / 100) * (100 + PrimarySatDiffs[645])) * 10) / 10 : HexToHSL("#" + secondaryColor)[1]}%) ${Math.max(HexToHSL("#" + secondaryColor)[2] - 1.1, 0)}%;
    --primary-630-hsl: ${HexToHSL("#" + secondaryColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + secondaryColor)[1]}%) ${HexToHSL("#" + secondaryColor)[2]}%;
    --primary-600-hsl: ${HexToHSL("#" + primaryColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + primaryColor)[1]}%) ${HexToHSL("#" + primaryColor)[2]}%;
    --primary-560-hsl: ${HexToHSL("#" + primaryColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + primaryColor)[1]}%) ${Math.min(HexToHSL("#" + primaryColor)[2] + 3.6, 100)}%;
    --primary-530-hsl: ${HexToHSL("#" + primaryColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + primaryColor)[1] / 100) * (100 + PrimarySatDiffs[530])) * 10) / 10 : HexToHSL("#" + primaryColor)[1]}%) ${Math.min(HexToHSL("#" + primaryColor)[2] + (3.6 * 2), 100)}%;
    --primary-500-hsl: ${HexToHSL("#" + primaryColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + primaryColor)[1] / 100) * (100 + PrimarySatDiffs[500])) * 10) / 10 : HexToHSL("#" + primaryColor)[1]}%) ${Math.min(HexToHSL("#" + primaryColor)[2] + (3.6 * 3), 100)}%;
    --interactive-muted: hsl(${HexToHSL("#" + primaryColor)[0]} ${HexToHSL("#" + primaryColor)[1] / 2}% ${Math.max(Math.min(HexToHSL("#" + primaryColor)[2] - 5, 100), 45)}%);
    ${tintedText ? `--primary-460-hsl: 0 calc(var(--saturation-factor, 1)*0%) 50%;
    --primary-430: ${HexToHSL("#" + secondaryColor)[0] === 0 ? "gray" : ((HexToHSL("#" + secondaryColor)[2] < 80) ? "hsl(" + HexToHSL("#" + secondaryColor)[0] + `, calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + primaryColor)[1] / 100) * (100 + PrimarySatDiffs[430])) * 10) / 10 : HexToHSL("#" + primaryColor)[1]}%), 90%)` : "hsl(" + HexToHSL("#" + secondaryColor)[0] + ", calc(var(--saturation-factor, 1)*100%), 20%)")};
    --primary-400: ${HexToHSL("#" + secondaryColor)[0] === 0 ? "gray" : ((HexToHSL("#" + secondaryColor)[2] < 80) ? "hsl(" + HexToHSL("#" + secondaryColor)[0] + `, calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + primaryColor)[1] / 100) * (100 + PrimarySatDiffs[400])) * 10) / 10 : HexToHSL("#" + primaryColor)[1]}%), 90%)` : "hsl(" + HexToHSL("#" + secondaryColor)[0] + ", calc(var(--saturation-factor, 1)*100%), 20%)")};
    --primary-360: ${HexToHSL("#" + secondaryColor)[0] === 0 ? "gray" : ((HexToHSL("#" + secondaryColor)[2] < 80) ? "hsl(" + HexToHSL("#" + secondaryColor)[0] + `, calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + primaryColor)[1] / 100) * (100 + PrimarySatDiffs[360])) * 10) / 10 : HexToHSL("#" + primaryColor)[1]}%), 90%)` : "hsl(" + HexToHSL("#" + secondaryColor)[0] + ", calc(var(--saturation-factor, 1)*100%), 20%)")};` : ""}
}
.emptyPage_feb902,
.scrollerContainer_dda72c,
.container__03ec9,
.header__71942 {
    background-color: unset !important;
}${(Math.round(HexToHSL("#" + primaryColor)[2]) > 80) ? `\n\n/*Primary*/
.theme-dark .container_bd15da,
.theme-dark .body__616e6,
.theme-dark .toolbar__62fb5,
.theme-dark .container_e1387b,
.theme-dark .messageContent_abea64,
.theme-dark .attachButtonPlus_fd0021,
.theme-dark .username__0b0e7:not([style]),
.theme-dark .children_cde9af,
.theme-dark .buttonContainer__6de7e,
.theme-dark .listItem__48528,
.theme-dark .body__616e6 .caret__33d19,
.theme-dark .body__616e6 .titleWrapper_d6133e > h1,
.theme-dark .body__616e6 .icon_ae0b42 {
    --white-500: black !important;
    --interactive-normal: black !important;
    --text-normal: black !important;
    --text-muted: black !important;
    --header-primary: black !important;
    --header-secondary: black !important;
}

.theme-dark .contentRegionScroller__9ae20 :not(.mtk1,.mtk2,.mtk3,.mtk4,.mtk5,.mtk6,.mtk7,.mtk8,.mtk9,.monaco-editor .line-numbers) {
    --white-500: black !important;
}

.theme-dark .container__6b2e5,
.theme-dark .container__03ec9,
.theme-dark .header__71942 {
    background: transparent;
}

.theme-dark .container__26baa {
    --channel-icon: black;
}

.theme-dark .callContainer__1477d {
    --white-500: ${(HexToHSL("#" + tertiaryColor)[2] > 80) ? "black" : "white"} !important;
}

.theme-dark .channelTextArea_c2094b {
    --text-normal: ${(HexToHSL("#" + primaryColor)[2] + 3.6 > 80) ? "black" : "white"};
}

.theme-dark .placeholder_dec8c7 {
    --channel-text-area-placeholder: ${(HexToHSL("#" + primaryColor)[2] + 3.6 > 80) ? "black" : "white"};
    opacity: .6;
}

.theme-dark .colorwaySelectorIcon {
    background-color: black;
}

.theme-dark .root_a28985 > .header__5e5a6 > h1 {
    color: black;
}
/*End Primary*/`: ""}${(HexToHSL("#" + secondaryColor)[2] > 80) ? `\n\n/*Secondary*/
.theme-dark .wrapper__3c6d5 *,
.theme-dark .sidebar_e031be *:not(.hasBanner__04337 *),
.theme-dark .members__573eb *:not([style]),
.theme-dark .sidebarRegionScroller__8113e *,
.theme-dark .header__8e271,
.theme-dark .lookFilled__950dd.colorPrimary_ebe632 {
    --white-500: black !important;
    --channels-default: black !important;
    --channel-icon: black !important;
    --interactive-normal: var(--white-500);
    --interactive-hover: var(--white-500);
    --interactive-active: var(--white-500);
}

.theme-dark .channelRow__538ef {
    background-color: var(--background-secondary);
}

.theme-dark .channelRow__538ef * {
    --channel-icon: black;
}

.theme-dark #app-mount .activity_bafb94 {
    --channels-default: var(--white-500) !important;
}

.theme-dark .nameTag__77ab2 {
    --header-primary: black !important;
    --header-secondary: ${HexToHSL("#" + secondaryColor)[0] === 0 ? "gray" : ((HexToHSL("#" + secondaryColor)[2] < 80) ? "hsl(" + HexToHSL("#" + secondaryColor)[0] + ", calc(var(--saturation-factor, 1)*100%), 90%)" : "hsl(" + HexToHSL("#" + secondaryColor)[0] + ", calc(var(--saturation-factor, 1)*100%), 20%)")} !important;
}

.theme-dark .bannerVisible_ef30fe .headerContent__6fcc7 {
    color: #fff;
}

.theme-dark .embedFull__14919 {
    --text-normal: black;
}
/*End Secondary*/`: ""}${HexToHSL("#" + tertiaryColor)[2] > 80 ? `\n\n/*Tertiary*/
.theme-dark .winButton_f17fb6,
.theme-dark .searchBar__310d8 *,
.theme-dark .wordmarkWindows_ffbc5e,
.theme-dark .searchBar__5a20a *,
.theme-dark .searchBarComponent__8f95f {
    --white-500: black !important;
}

.theme-dark [style="background-color: var(--background-secondary);"] {
    color: ${HexToHSL("#" + secondaryColor)[2] > 80 ? "black" : "white"};
}

.theme-dark .popout__24e32 > * {
    --interactive-normal: black !important;
    --header-secondary: black !important;
}

.theme-dark .tooltip__7b090 {
    --text-normal: black !important;
}
.theme-dark .children_cde9af .icon_ae0b42 {
    color: var(--interactive-active) !important;
}
/*End Tertiary*/`: ""}${HexToHSL("#" + accentColor)[2] > 80 ? `\n\n/*Accent*/
.selected_aded59 *,
.selected_ae80f7 *,
#app-mount .lookFilled__950dd.colorBrand__27d57:not(.buttonColor__7bad9),
.colorDefault_e361cf.focused_dcafb9,
.row__9e25f:hover,
.colorwayInfoIcon,
.checkmarkCircle_b1b1cc > circle {
    --white-500: black !important;
}

.ColorwaySelectorBtn:hover .vc-pallete-icon {
    color: #000 !important;
}

:root:root {
    --mention-foreground: black !important;
}
/*End Accent*/`: ""}`;
}

export function getPreset(primaryColor?: string, secondaryColor?: string, tertiaryColor?: string, accentColor?: string) {
    function cyan(discordSaturation = false) {
        return `:root:root {
    --cyan-accent-color: ${"#" + accentColor};
    --cyan-background-primary: hsl(${HexToHSL("#" + primaryColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + primaryColor)[1]}%) ${HexToHSL("#" + primaryColor)[2]}%/40%);
    --cyan-background-secondary: hsl(${HexToHSL("#" + tertiaryColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + tertiaryColor)[1]}%) ${Math.min(HexToHSL("#" + tertiaryColor)[2] + (3.6 * 2), 100)}%);
}`;
    }

    function cyan2(discordSaturation = false) {
        return `:root:root {
    --cyan-accent-color: ${"#" + accentColor};
    --cyan-background-primary: hsl(${HexToHSL("#" + primaryColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + primaryColor)[1]}%) ${HexToHSL("#" + primaryColor)[2]}%/60%);
    --cyan-second-layer: hsl(${HexToHSL("#" + tertiaryColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + tertiaryColor)[1]}%) ${Math.min(HexToHSL("#" + tertiaryColor)[2] + (3.6 * 2), 100)}%/60%);
}`;
    }

    function virtualBoy(discordSaturation = false) {
        return `:root:root {
    --VBaccent: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${HexToHSL("#" + accentColor)[2]}%;
    --VBaccent-muted: ${HexToHSL("#" + tertiaryColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + tertiaryColor)[1]}%) ${Math.max(((HexToHSL("#" + tertiaryColor)[2]) - 10), 0)}%;
    --VBaccent-dimmest: ${HexToHSL("#" + tertiaryColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + tertiaryColor)[1]}%) ${Math.min((HexToHSL("#" + tertiaryColor)[2] + (3.6 * 5) - 3), 100)}%;
}`;
    }

    function modular(discordSaturation = false) {
        return `:root:root {
    --modular-hue: ${HexToHSL("#" + accentColor)[0]};
    --modular-saturation: calc(var(--saturation-factor, 1)${HexToHSL("#" + accentColor)[1]}%);
    --modular-lightness: ${HexToHSL("#" + accentColor)[2]}%;
}`;
    }

    function solana(discordSaturation = false) {
        return `:root:root {
    --accent-hue: ${HexToHSL("#" + accentColor)[0]};
    --accent-saturation: calc(var(--saturation-factor, 1)${HexToHSL("#" + accentColor)[1]}%);
    --accent-brightness: ${HexToHSL("#" + accentColor)[2]}%;
    --background-accent-hue: ${HexToHSL("#" + primaryColor)[0]};
    --background-accent-saturation: calc(var(--saturation-factor, 1)${HexToHSL("#" + primaryColor)[1]}%);
    --background-accent-brightness: ${HexToHSL("#" + primaryColor)[2]}%;
    --background-overlay-opacity: 0%;
}`;
    }

    function gradientType1(discordSaturation = false) {
        return {
            full: `${gradientBase(accentColor, discordSaturation)}
            :root:root {
                --custom-theme-background: linear-gradient(239.16deg, #${primaryColor} 10.39%, #${secondaryColor} 26.87%, #${tertiaryColor} 48.31%, hsl(${HexToHSL("#" + secondaryColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + secondaryColor)[1]}%) ${Math.min(HexToHSL("#" + secondaryColor)[2] + 3.6, 100)}%) 64.98%, #${primaryColor} 92.5%);
            }`,
            base: `239.16deg, #${primaryColor} 10.39%, #${secondaryColor} 26.87%, #${tertiaryColor} 48.31%, hsl(${HexToHSL("#" + secondaryColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + secondaryColor)[1]}%) ${Math.min(HexToHSL("#" + secondaryColor)[2] + 3.6, 100)}%) 64.98%, #${primaryColor} 92.5%`
        };
    }

    function gradientType2(discordSaturation = false) {
        return {
            full: `${gradientBase(accentColor, discordSaturation)}
        :root:root {
            --custom-theme-background: linear-gradient(48.17deg, #${primaryColor} 11.21%, #${secondaryColor} 61.92%);
        }`, base: `48.17deg, #${primaryColor} 11.21%, #${secondaryColor} 61.92%`
        };
    }

    function hueRotation(discordSaturation = false) {
        return `:root:root {
    --brand-100-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[100])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[100]) * 10) / 10, 0)};
    --brand-130-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[130])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[130]) * 10) / 10, 0)}%;
    --brand-160-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[160])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[160]) * 10) / 10, 0)}%;
    --brand-200-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[200])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[200]) * 10) / 10, 0)}%;
    --brand-230-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[230])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[230]) * 10) / 10, 0)}%;
    --brand-260-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[260])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[260]) * 10) / 10, 0)}%;
    --brand-300-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[300])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[300]) * 10) / 10, 0)}%;
    --brand-330-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[330])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[330]) * 10) / 10, 0)}%;
    --brand-345-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[345])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[345]) * 10) / 10, 0)}%;
    --brand-360-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[360])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[360]) * 10) / 10, 0)}%;
    --brand-400-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[400])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[400]) * 10) / 10, 0)}%;
    --brand-430-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[430])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[430]) * 10) / 10, 0)}%;
    --brand-460-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[460])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[460]) * 10) / 10, 0)}%;
    --brand-500-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${HexToHSL("#" + accentColor)[2]}%;
    --brand-530-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[530])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[530]) * 10) / 10, 100)}%;
    --brand-560-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[560])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[560]) * 10) / 10, 100)}%;
    --brand-600-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[600])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[600]) * 10) / 10, 100)}%;
    --brand-630-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[630])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[630]) * 10) / 10, 100)}%;
    --brand-660-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[660])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[660]) * 10) / 10, 100)}%;
    --brand-700-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[700])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[700]) * 10) / 10, 100)}%;
    --brand-730-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[730])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[730]) * 10) / 10, 100)}%;
    --brand-760-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[760])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[760]) * 10) / 10, 100)}%;
    --brand-800-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[800])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[800]) * 10) / 10, 100)}%;
    --brand-830-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[830])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[830]) * 10) / 10, 100)}%;
    --brand-860-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[860])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[860]) * 10) / 10, 100)}%;
    --brand-900-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[900])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[900]) * 10) / 10, 100)}%;
    --primary-800-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*12%) 7%;
    --primary-730-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*10%) 13%;
    --primary-700-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*10%) 13%;
    --primary-660-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*11%) 15%;
    --primary-645-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*11%) 16%;
    --primary-630-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*11%) 18%;
    --primary-600-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*11%) 21%;
    --primary-560-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*11%) 24%;
    --primary-530-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*11%) 24%;
    --primary-500-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*11%) 24%;
}`;
    }

    function accentSwap(discordSaturation = false) {
        return `:root:root {
    --brand-100-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[100])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[100]) * 10) / 10, 0)};
    --brand-130-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[130])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[130]) * 10) / 10, 0)}%;
    --brand-160-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[160])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[160]) * 10) / 10, 0)}%;
    --brand-200-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[200])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[200]) * 10) / 10, 0)}%;
    --brand-230-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[230])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[230]) * 10) / 10, 0)}%;
    --brand-260-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[260])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[260]) * 10) / 10, 0)}%;
    --brand-300-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[300])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[300]) * 10) / 10, 0)}%;
    --brand-330-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[330])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[330]) * 10) / 10, 0)}%;
    --brand-345-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[345])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[345]) * 10) / 10, 0)}%;
    --brand-360-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[360])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[360]) * 10) / 10, 0)}%;
    --brand-400-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[400])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[400]) * 10) / 10, 0)}%;
    --brand-430-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[430])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[430]) * 10) / 10, 0)}%;
    --brand-460-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[460])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[460]) * 10) / 10, 0)}%;
    --brand-500-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${HexToHSL("#" + accentColor)[2]}%;
    --brand-530-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[530])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[530]) * 10) / 10, 100)}%;
    --brand-560-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[560])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[560]) * 10) / 10, 100)}%;
    --brand-600-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[600])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[600]) * 10) / 10, 100)}%;
    --brand-630-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[630])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[630]) * 10) / 10, 100)}%;
    --brand-660-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[660])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[660]) * 10) / 10, 100)}%;
    --brand-700-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[700])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[700]) * 10) / 10, 100)}%;
    --brand-730-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[730])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[730]) * 10) / 10, 100)}%;
    --brand-760-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[760])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[760]) * 10) / 10, 100)}%;
    --brand-800-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[800])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[800]) * 10) / 10, 100)}%;
    --brand-830-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[830])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[830]) * 10) / 10, 100)}%;
    --brand-860-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[860])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[860]) * 10) / 10, 100)}%;
    --brand-900-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + accentColor)[1] / 100) * (100 + BrandSatDiffs[900])) * 10) / 10 : HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round((HexToHSL("#" + accentColor)[2] + BrandLightDiffs[900]) * 10) / 10, 100)}%;
}`;
    }

    return {
        default: {
            name: "Default",
            preset: generateCss,
            id: "default",
            colors: ["accent", "primary", "secondary", "tertiary"]
        },
        cyan: {
            name: "Cyan",
            preset: cyan,
            id: "cyan",
            colors: ["accent", "primary", "secondary"]
        },
        cyan2: {
            name: "Cyan 2",
            preset: cyan2,
            id: "cyan2",
            colors: ["accent", "primary", "secondary"]
        },
        virtualBoy: {
            name: "Virtual Boy",
            preset: virtualBoy,
            id: "virtualBoy",
            colors: ["accent", "tertiary"]
        },
        modular: {
            name: "Modular",
            preset: modular,
            id: "modular",
            colors: ["accent"]
        },
        solana: {
            name: "Solana",
            preset: solana,
            id: "solana",
            colors: ["accent", "primary"]
        },
        gradientType1: {
            name: "Gradient Type 1",
            preset: gradientType1,
            id: "gradientType1",
            colors: ["accent", "primary", "secondary", "tertiary"]
        },
        gradientType2: {
            name: "Gradient Type 2",
            preset: gradientType2,
            id: "gradientType2",
            colors: ["accent", "primary", "secondary"]
        },
        hueRotation: {
            name: "Hue Rotation",
            preset: hueRotation,
            id: "hueRotation",
            colors: ["accent"]
        },
        accentSwap: {
            name: "Accent Swap",
            preset: accentSwap,
            id: "accentSwap",
            colors: ["accent"]
        }
    };
}

export const gradientPresetIds = [
    "gradientType1",
    "gradientType2"
];
