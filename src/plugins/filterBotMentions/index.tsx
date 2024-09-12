/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { getCurrentGuild } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { FluxDispatcher } from "@webpack/common";
import { Message } from "discord-types/general";


const settings = definePluginSettings({
    toggle: {
        type: OptionType.BOOLEAN,
        description: "Filter out mentions by bots",
        default: false,
    },
});

type fetchRecentMentionsType = (before: BigInt | null, limit: Number | null, all_servers: string | null | undefined, role: boolean, everyone: boolean,) => void;
const { fetchRecentMentions } = findByPropsLazy("fetchRecentMentions") as { fetchRecentMentions: fetchRecentMentionsType; };

interface ReloadMentions {
    everyone: boolean;
    role: boolean;
    all_servers: boolean;
}

export default definePlugin({
    name: "FilterBotMentions",
    description: "Filter mentions by bots in inbox",
    authors: [Devs.Taran],

    patches: [
        {
            find: "type:\"LOAD_RECENT_MENTIONS_SUCCESS\"",
            replacement: {
                match: /dispatch\(\{type:"LOAD_RECENT_MENTIONS_SUCCESS",messages:(\i)/,
                replace: "$&.filter($self.filterMessages)"
            }
        },
        {
            find: "analyticsName:\"Recent Mentions\"",
            replacement: {
                match: /channel:\i,messages:\i/,
                replace: "$&?.filter($self.filterMessages)"
            }
        },
        {
            find: "mentions-filter",
            replacement: {
                match: /children:\[\(0,(\i)\.jsx\)\((\i).{0,200}(\i)\.(\i)\.setGuildFilter.{0,100}checked:(\i).{0,200}checked:(\i).{0,300}checked:(.{0,30})\}\)\]/,
                replace: "$&.concat([(0,$1.jsx)($2.MenuCheckboxItem, {id:\"Bots\", label:\"Include mentions by bots\", action: function() {$self.toggleBotMentions();$self.reloadMentions($5, $6, $7)}, checked: $self.settings.store.toggle})])"
            }
        }

    ],
    settings,
    reloadMentions({ everyone, role, all_servers }: ReloadMentions): void {
        FluxDispatcher.dispatch({ type: "CLEAR_MENTIONS" });
        const serverToFilter: string | undefined | null = all_servers ? null : getCurrentGuild()?.id;
        fetchRecentMentions(null, null, serverToFilter, role, everyone);

    },
    toggleBotMentions(): void {
        settings.store.toggle = !settings.store.toggle;
    },
    filterMessages(message: Message): boolean {
        console.log(this, self, self.settings);
        return !message.author.bot || settings.store.toggle;

    }

});
