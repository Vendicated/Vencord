/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { getCurrentGuild } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy, findStoreLazy } from "@webpack";
import { Menu } from "@webpack/common";
import { Message } from "discord-types/general";


const settings = definePluginSettings({
    toggle: {
        type: OptionType.BOOLEAN,
        description: "Include mentions by bots in inbox",
        default: true,
    },
});

type RecentMentionsStore = { guildFilter: string, roleFilter: boolean, everyoneFilter: boolean; };
type fetchRecentMentionsType = (before: BigInt | null, limit: Number | null, all_servers: string | null | undefined, role: boolean, everyone: boolean,) => void;

const { fetchRecentMentions } = findByPropsLazy("fetchRecentMentions") as { fetchRecentMentions: fetchRecentMentionsType; };
const recentMentionsStore = findStoreLazy("RecentMentionsStore") as RecentMentionsStore;


export default definePlugin({
    name: "FilterBotMentions",
    description: "Filter mentions by bots in inbox",
    authors: [Devs.Taran],

    patches: [
        {
            find: "get lastLoaded",
            replacement: {
                match: /getMentions.{0,30}\?\i/,
                replace: "$&.filter($self.filterMessages)"
            }
        },
        {
            find: "mentions-filter",
            replacement: {
                match: /children:\[\(0,\i\.jsx\).{0,600}\}\)\]/,
                replace: "$&.concat($self.patchMenu())"
            }
        }

    ],
    settings,
    reloadMentions(): void {
        const all_servers: boolean = recentMentionsStore.guildFilter === "ALL_SERVERS";
        const { roleFilter: role, everyoneFilter: everyone } = recentMentionsStore;
        const serverToFilter: string | undefined | null = all_servers ? null : getCurrentGuild()?.id;
        fetchRecentMentions(null, null, serverToFilter, role, everyone);
    },

    toggleBotMentions(): void {
        settings.store.toggle = !settings.store.toggle;
    },

    filterMessages(message: Message): boolean {
        return !message.author.bot || settings.store.toggle;

    },

    patchMenu() {
        return (
            <Menu.MenuCheckboxItem
                id="Bots"
                label="Include mentions by bots"
                action={() => {
                    this.toggleBotMentions();
                    this.reloadMentions();
                }}
                checked={settings.store.toggle}
            />
        );
    }

});
