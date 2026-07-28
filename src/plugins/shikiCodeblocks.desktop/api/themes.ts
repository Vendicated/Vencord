/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
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

import { IShikiTheme } from "@vap/shiki";

export const SHIKI_REPO = "shikijs/textmate-grammars-themes";
export const SHIKI_REPO_COMMIT = "bc5436518111d87ea58eb56d97b3f9bec30e6b83";
export const shikiRepoTheme = (name: string) => `https://cdn.jsdelivr.net/gh/${SHIKI_REPO}@${SHIKI_REPO_COMMIT}/packages/tm-themes/themes/${name}.json`;

export const themes = {
    // Default
    DarkPlus: shikiRepoTheme("dark-plus"),

    // Dev Choices
    MaterialCandy: "https://raw.githubusercontent.com/millsp/material-candy/master/material-candy.json",

    // More from Shiki repo
    Andromeeda: shikiRepoTheme("andromeeda"),
    AuroraX: shikiRepoTheme("aurora-x"),
    AyuDark: shikiRepoTheme("ayu-dark"),
    CatppuccinLatte: shikiRepoTheme("catppuccin-latte"),
    CatppuccinFrappe: shikiRepoTheme("catppuccin-frappe"),
    CatppuccinMacchiato: shikiRepoTheme("catppuccin-macchiato"),
    CatppuccinMocha: shikiRepoTheme("catppuccin-mocha"),
    DraculaSoft: shikiRepoTheme("dracula-soft"),
    Dracula: shikiRepoTheme("dracula"),
    EverforestDark: shikiRepoTheme("everforest-dark"),
    EverforestLight: shikiRepoTheme("everforest-light"),
    GithubDarkDefault: shikiRepoTheme("github-dark-default"),
    GithubDarkDimmed: shikiRepoTheme("github-dark-dimmed"),
    GithubDarkHighContrast: shikiRepoTheme("github-dark-high-contrast"),
    GithubDark: shikiRepoTheme("github-dark"),
    GithubLightDefault: shikiRepoTheme("github-light-default"),
    GithubLightHighContrast: shikiRepoTheme("github-light-high-contrast"),
    GithubLight: shikiRepoTheme("github-light"),
    GruvBoxDarkHard: shikiRepoTheme("gruvbox-dark-hard"),
    GruvBoxDarkMedium: shikiRepoTheme("gruvbox-dark-medium"),
    GruvBoxDarkSoft: shikiRepoTheme("gruvbox-dark-soft"),
    GruvBoxLightHard: shikiRepoTheme("gruvbox-light-hard"),
    GruvBoxLightMedium: shikiRepoTheme("gruvbox-light-medium"),
    GruvBoxLightSoft: shikiRepoTheme("gruvbox-light-soft"),
    Houston: shikiRepoTheme("houston"),
    KanagawaDragon: shikiRepoTheme("kanagawa-dragon"),
    KanagawaLotus: shikiRepoTheme("kanagawa-lotus"),
    KanagawaWave: shikiRepoTheme("kanagawa-wave"),
    LaserWave: shikiRepoTheme("laserwave"),
    LightPlus: shikiRepoTheme("light-plus"),
    MaterialDarker: shikiRepoTheme("material-theme-darker"),
    MaterialDefault: shikiRepoTheme("material-theme"),
    MaterialLighter: shikiRepoTheme("material-theme-lighter"),
    MaterialOcean: shikiRepoTheme("material-theme-ocean"),
    MaterialPalenight: shikiRepoTheme("material-theme-palenight"),
    MinDark: shikiRepoTheme("min-dark"),
    MinLight: shikiRepoTheme("min-light"),
    Monokai: shikiRepoTheme("monokai"),
    NightOwl: shikiRepoTheme("night-owl"),
    Nord: shikiRepoTheme("nord"),
    OneDarkPro: shikiRepoTheme("one-dark-pro"),
    OneLight: shikiRepoTheme("one-light"),
    Plastic: shikiRepoTheme("plastic"),
    Poimandres: shikiRepoTheme("poimandres"),
    Red: shikiRepoTheme("red"),
    RosePineDawn: shikiRepoTheme("rose-pine-dawn"),
    RosePineMoon: shikiRepoTheme("rose-pine-moon"),
    RosePine: shikiRepoTheme("rose-pine"),
    SlackDark: shikiRepoTheme("slack-dark"),
    SlackOchin: shikiRepoTheme("slack-ochin"),
    SnazzyLight: shikiRepoTheme("snazzy-light"),
    SolarizedDark: shikiRepoTheme("solarized-dark"),
    SolarizedLight: shikiRepoTheme("solarized-light"),
    Synthwave84: shikiRepoTheme("synthwave-84"),
    TokyoNight: shikiRepoTheme("tokyo-night"),
    Vesper: shikiRepoTheme("vesper"),
    VitesseBlack: shikiRepoTheme("vitesse-black"),
    VitesseDark: shikiRepoTheme("vitesse-dark"),
    VitesseLight: shikiRepoTheme("vitesse-light"),
};

export const themeCache = new Map<string, IShikiTheme>();

export const getTheme = (url: string): Promise<IShikiTheme> => {
    if (themeCache.has(url)) return Promise.resolve(themeCache.get(url)!);
    return fetch(url).then(res => res.json());
};
