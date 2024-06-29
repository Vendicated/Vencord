/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";
import { findStoreLazy } from "@webpack";
import { Button, GuildStore } from "@webpack/common";
import { Guild } from "discord-types/general";

import { addIndicator, removeIndicator, rerender } from ".";

const SortedGuildStore = findStoreLazy("SortedGuildStore");

const DB_KEY = "HideServers_servers";

export let hiddenGuilds: Set<string> = new Set();

export function addHidden(guild: Guild) {
    hiddenGuilds.add(guild.id);
    rerender();
    DataStore.set(DB_KEY, hiddenGuilds);
}

export async function loadHidden() {
    const data = await DataStore.get(DB_KEY);
    if (data) {
        hiddenGuilds = data;
    }
    // rerender();
}

export function removeHidden(id: string) {
    hiddenGuilds.delete(id);
    rerender();
    DataStore.set(DB_KEY, hiddenGuilds);
}

export function clearHidden() {
    hiddenGuilds.clear();
    DataStore.del(DB_KEY);
    rerender();
}

export function hiddenGuildsDetail(): Guild[] {
    const sortedGuildIds = SortedGuildStore.getFlattenedGuildIds() as string[];
    // otherwise the list is in order of increasing id number which is confusing
    return sortedGuildIds.filter(id => hiddenGuilds.has(id)).map(id => GuildStore.getGuild(id));
}

export const settings = definePluginSettings({
    showManager: {
        type: OptionType.BOOLEAN,
        description: "Show menu to unhide servers at the bottom of the list",
        default: true,
        onChange: val => {
            if (val) {
                addIndicator();
            } else {
                removeIndicator();
            }
        }
    },
    resetHidden: {
        type: OptionType.COMPONENT,
        description: "Remove all hidden guilds from the list",
        component: () => (
            <div>
                <Button
                    size={Button.Sizes.SMALL}
                    color={Button.Colors.RED}
                    onClick={() => clearHidden()}
                >
                    Reset Hidden Guilds
                </Button>
            </div>
        ),
    },
});
