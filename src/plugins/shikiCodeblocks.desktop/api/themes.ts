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

import { IShikiTheme } from "@vap/shiki";

export const SHIKI_REPO = "shikijs/shiki";
export const SHIKI_REPO_COMMIT = "0b28ad8ccfbf2615f2d9d38ea8255416b8ac3043";
export const shikiRepoTheme = (name: string) => `https://raw.githubusercontent.com/${SHIKI_REPO}/${SHIKI_REPO_COMMIT}/packages/shiki/themes/${name}.json`;

export const themes = {
    // Default
    DarkPlus: shikiRepoTheme("dark-plus"),

    // Dev Choices
    MaterialCandy: "https://raw.githubusercontent.com/millsp/material-candy/master/material-candy.json",

    // More from Shiki repo
    DraculaSoft: shikiRepoTheme("dracula-soft"),
    Dracula: shikiRepoTheme("dracula"),
    GithubDarkDimmed: shikiRepoTheme("github-dark-dimmed"),
    GithubDark: shikiRepoTheme("github-dark"),
    GithubLight: shikiRepoTheme("github-light"),
    LightPlus: shikiRepoTheme("light-plus"),
    MaterialDarker: shikiRepoTheme("material-darker"),
    MaterialDefault: shikiRepoTheme("material-default"),
    MaterialLighter: shikiRepoTheme("material-lighter"),
    MaterialOcean: shikiRepoTheme("material-ocean"),
    MaterialPalenight: shikiRepoTheme("material-palenight"),
    MinDark: shikiRepoTheme("min-dark"),
    MinLight: shikiRepoTheme("min-light"),
    Monokai: shikiRepoTheme("monokai"),
    Nord: shikiRepoTheme("nord"),
    OneDarkPro: shikiRepoTheme("one-dark-pro"),
    Poimandres: shikiRepoTheme("poimandres"),
    RosePineDawn: shikiRepoTheme("rose-pine-dawn"),
    RosePineMoon: shikiRepoTheme("rose-pine-moon"),
    RosePine: shikiRepoTheme("rose-pine"),
    SlackDark: shikiRepoTheme("slack-dark"),
    SlackOchin: shikiRepoTheme("slack-ochin"),
    SolarizedDark: shikiRepoTheme("solarized-dark"),
    SolarizedLight: shikiRepoTheme("solarized-light"),
    VitesseDark: shikiRepoTheme("vitesse-dark"),
    VitesseLight: shikiRepoTheme("vitesse-light"),
    CssVariables: shikiRepoTheme("css-variables"),
};

export const themeCache = new Map<string, IShikiTheme>();

export const getTheme = (url: string): Promise<IShikiTheme> => {
    if (themeCache.has(url)) return Promise.resolve(themeCache.get(url)!);
    return fetch(url).then(res => res.json());
};
