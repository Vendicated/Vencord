/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";
import { Button } from "@webpack/common";
import { Guild } from "discord-types/general";

import { rerenderRef } from ".";

const DB_KEY = "HideServers_servers";

export let hiddenGuilds: Set<string> = new Set();

function rerender() {
    const ref = rerenderRef?.deref();
    if (ref) {
        ref();
    }
}

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

export function clearHidden() {
    hiddenGuilds.clear();
    DataStore.del(DB_KEY);
    rerender();
}

export const settings = definePluginSettings({
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
