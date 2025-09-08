/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { get, set } from "@api/DataStore";

import { createColoredCrownIcon, tagIcons } from "./components/Icons";
import { TAGS } from "./tag";
import { ColoredTag, CSSHex, CustomColoredTag, TagColors } from "./types";

const STORE_KEY = "EnhancedUserTagColors";

const DEFAULT_TAG_COLORS: TagColors = {
    [TAGS.THREAD_CREATOR]: "#D9A02D",
    [TAGS.POST_CREATOR]: "#D9A02D",
    [TAGS.MODERATOR]: "#AA6000",
    [TAGS.ADMINISTRATOR]: "#E0E0E0",
    [TAGS.GROUP_OWNER]: "#D9A02D",
    [TAGS.GUILD_OWNER]: "#D9A02D",

    [TAGS.BOT]: "#0BDA51",
    [TAGS.WEBHOOK]: "#5865F2",
};

const tagColors: TagColors = new Proxy({ ...DEFAULT_TAG_COLORS }, {
    // auto recreate tags on color change
    // mb there's some way to re-render component by providing props into React.memo instead recreating it
    // but sadly don't have much exp with react
    set: (target, tag, color) => {
        // no need to recreate component if color have no changes
        if (color !== target[tag]) {
            target[tag] = color;
            tagIcons[tag] = createColoredCrownIcon(tag as any as CustomColoredTag);
        }

        return true;
    },
});

async function initColors() {
    const savedColors = await get<Partial<TagColors>>(STORE_KEY);

    if (!savedColors) {
        await set(STORE_KEY, { ...tagColors });
    } else {
        Object.assign(tagColors, savedColors);
    }
}
initColors();

export const getColor = (tag: ColoredTag): CSSHex => {
    return tagColors[tag];
};

export const setColor = async (tag: CustomColoredTag, color: CSSHex) => {
    tagColors[tag] = color;

    await set(STORE_KEY, { ...tagColors });
};

export const resetColor = async (tag: CustomColoredTag) => {
    tagColors[tag] = DEFAULT_TAG_COLORS[tag];

    await set(STORE_KEY, { ...tagColors });
};
