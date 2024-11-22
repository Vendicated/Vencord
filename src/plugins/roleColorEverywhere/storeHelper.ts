/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { GuildStore } from "@webpack/common";

// Using plain replaces cause i dont want sanitize regexp
export function toggleRole(colorsStore: ColorsStore, guildId: string, id: string) {
    let roles = colorsStore[guildId];
    const len = roles.length;

    roles = roles.filter(e => e !== id);

    if (len === roles.length) {
        roles.push(id);
    }

    colorsStore[guildId] = roles;
}

export function atLeastOneOverrideAppliesToGuild(overrides: string[], guildId: string) {
    for (const role of overrides) {
        if (GuildStore.getRole(guildId, role)) {
            return true;
        }
    }

    return false;
}
