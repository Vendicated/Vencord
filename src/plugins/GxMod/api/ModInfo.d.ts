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


export interface GxModInfo {
    data: Data;
    errors: any[];
}

interface Data {
    modId: string;
    modVersion: string;
    modShortId: string;
    title: string;
    description: string;
    ageRating: string;
    studio: Studio;
    covers: Cover[];
    mangledTitle: string;
    modTags: ModTTag[];
    modTypeTags: ModTTag[];
    crxId: string;
    manifestSource: ManifestSource;
    icons: Icon[];
    graphics: Graphic[];
    creationDate: string;
    lastModified: string;
    numberOfDownloads: number;
    longDescription: string;
    allowedFeedback: boolean;
}

interface Cover {
    coverUrl: string;
    variants: Variant[];
    aspectRatio: string;
    type: string;
}

interface Variant {
    variantKey: VariantKey;
    url: string;
    mimeType: MIMEType;
    width: number;
    height: number | null;
}

declare enum VariantKey {
    Webp1280X720 = "webp-1280x720",
    Webp320X180 = "webp-320x180",
    Webp640X360 = "webp-640x360",
}

declare enum MIMEType {
    ImageWebp = "image/webp",
}

interface Graphic {
    url: string;
    thumbnailUrl: string;
    type: string;
    variants: Variant[];
}

interface Icon {
    name: string;
    iconUrl: string;
}

interface ManifestSource {
    mod: Mod;
    name: string;
    manifest_version: number;
    description: string;
    developer: Developer;
    icons: Icons;
    version: string;
}

interface Developer {
    name: string;
}

interface Icons {
    "512": string;
}

interface Mod {
    license: string;
    payload: Payload;
    schema_version: number;
}

interface Payload {
    background_music: string[];
    browser_sounds: { [key: string]: string[]; };
    keyboard_sounds: KeyboardSounds;
    page_styles: PageStyle[];
    theme: Theme;
    wallpaper: Wallpaper;
}

interface KeyboardSounds {
    TYPING_BACKSPACE: string[];
    TYPING_ENTER: string[];
    TYPING_LETTER: string[];
    TYPING_SPACE: string[];
}

interface PageStyle {
    css: string[];
    matches: string[];
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

interface ModTTag {
    tagId: string;
    alias: string;
    parentTagId: string;
    parentTagAlias: string;
    title: Title;
    icon: null;
    displayOrder: number;
    numberOfMods: number;
}

interface Title {
    value: string;
}

interface Studio {
    studioId: string;
    studioVersion: string;
    name: string;
}
