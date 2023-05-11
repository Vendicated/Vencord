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

import { Variant } from "./ModInfo";

export interface ModCatalogue {
    data: Data;
    errors: any[];
}

interface Data {
    mods: Mod[];
    pagination: Pagination;
}

interface Mod {
    modId: string;
    modVersion: string;
    modShortId: string;
    title: string;
    description: string;
    ageRating: AgeRating;
    studio: Studio;
    covers: Cover[];
    mangledTitle: string;
    modTags: ModTTag[];
    modTypeTags: ModTTag[];
}

declare enum AgeRating {
    Adults = "ADULTS",
    Children = "CHILDREN",
    EarlyTeens = "EARLY_TEENS",
    Everyone = "EVERYONE",
}

interface Cover {
    coverUrl: string;
    variants: Variant[];
    type: Type;
}

declare enum Type {
    Image = "IMAGE",
    Video = "VIDEO",
}

export interface ModTTag {
    tagId: string;
    alias: string;
    parentTagId: string;
    parentTagAlias: ParentTagAlias;
    title: Title;
    icon: null;
    displayOrder: number;
    numberOfMods: number;
}

declare enum ParentTagAlias {
    CreatorMods = "creator-mods",
    ModType = "mod-type",
    SoundMusicType = "sound-music-type",
    State = "state",
    Style = "style",
    Vibe = "vibe",
    WebModdingType = "web-modding-type",
}

interface Title {
    value: string;
    translations: Translations;
}

interface Translations {
}

interface Studio {
    studioId: string;
    studioVersion: string;
    name: string;
}

interface Pagination {
    currPage: number;
    numPerPage: number;
    totalPages: number;
    totalItems: number;
}
