/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@utils/css";

export const cl = classNameFactory("vc-ud-");

export interface UrbanDefinition {
    definition: string;
    permalink: string;
    thumbs_up: number;
    author: string;
    word: string;
    defid: number;
    current_vote: string;
    written_on: string;
    example: string;
    thumbs_down: number;
}

export interface UrbanResponse {
    list: UrbanDefinition[];
}

export async function fetchDefinitions(term: string): Promise<UrbanDefinition[]> {
    const response = await fetch(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(term)}`);
    if (!response.ok) {
        throw new Error(`Urban Dictionary API returned ${response.status} ${response.statusText}`);
    }
    const data: UrbanResponse = await response.json();
    return data.list;
}
