/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { GuildRoleStore } from "@webpack/common";

import { blendColors } from "./blendColors";
import { atLeastOneOverrideAppliesToGuild } from "./storeHelper";

export function brewUserColor(colorsStore: ColorsStore, roles: string[], guildId: string) {
    const overrides = colorsStore[guildId];
    if (!overrides?.length) return null;

    if (atLeastOneOverrideAppliesToGuild(overrides, guildId!)) {
        const memberRoles = roles.map(role => GuildRoleStore.getRole(guildId!, role)).filter(e => e);
        const blendColorsFromRoles = memberRoles
            .filter(role => overrides.includes(role.id))
            .sort((a, b) => b.color - a.color);

        // if only one override apply, return the first role color
        if (blendColorsFromRoles.length < 2)
            return blendColorsFromRoles[0]?.colorString ?? null;

        const color = blendColorsFromRoles
            .slice(1)
            .reduce(
                (p, c) => blendColors(p, c!.colorString!, .5),
                blendColorsFromRoles[0].colorString!
            );

        return color;
    }

    return null;
}
