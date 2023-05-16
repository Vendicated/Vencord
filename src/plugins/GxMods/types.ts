/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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



export interface GxModManifest {
    mod: Mod;
    manifest_version: number;
    name: string;
    update_url: string;
    description: string;
    developer: Developer;
    icons: Icons;
    version: string;
    key: string;
}

interface Developer {
    name: string;
}

interface Icons {
    "512": string;
}

interface Mod {
    payload: Payload;
    schema_version: number;
}

interface Payload {
    background_music?: string[];
    browser_sounds?: { [key: string]: string[]; };
    keyboard_sounds?: KeyboardSounds;
    theme: Theme;
    wallpaper: Wallpaper;
}

interface KeyboardSounds {
    TYPING_BACKSPACE: string[];
    TYPING_ENTER: string[];
    TYPING_LETTER: string[];
    TYPING_SPACE: string[];
}

interface Theme {
    dark: ThemeDark;
    light: ThemeDark;
}

interface ThemeDark {
    gx_accent: Gx;
    gx_secondary_base: Gx;
}

interface Gx {
    h: number;
    s: number;
    l: number;
}

interface Wallpaper {
    dark: WallpaperDark;
    light: WallpaperDark;
}

interface WallpaperDark {
    image: string;
    first_frame: string;
    text_color: string;
    text_shadow: string;
}
