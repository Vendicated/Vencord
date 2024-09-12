/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { getCurrentGuild } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { findByProps } from "@webpack";
import { FluxDispatcher } from "@webpack/common";

const settings = definePluginSettings({
    toggle: {
        type: OptionType.BOOLEAN,
        description: "Filter out mentions by bots",
        default: false,
    },
});


export default definePlugin({
    name: "Filter Bot Mentions",
    description: "Filter mentions by bots",
    authors: [Devs.Taran],

    patches: [
        {
            find: "type:\"LOAD_RECENT_MENTIONS_SUCCESS\"",
            replacement: {
                match: /dispatch\(\{type:"LOAD_RECENT_MENTIONS_SUCCESS",messages:(\i)/,
                replace: "$&.filter(function (message) {if (!message.author.bot){return true} else {return $self.settings.store.toggle}})"
            }
        },
        {
            find: "analyticsName:\"Recent Mentions\"",
            replacement: {
                match: /channel:\i,messages:\i/,
                replace: "$&?.filter(function (message) {if (!message.author.bot){return true} else {return $self.settings.store.toggle}})"
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
    reloadMentions(everyone: boolean, role: boolean, all_servers: boolean) {
        FluxDispatcher.dispatch({ type: "CLEAR_MENTIONS" });
        all_servers = all_servers ? null : getCurrentGuild()?.id;

        findByProps("fetchRecentMentions").fetchRecentMentions(null, null, all_servers, role, everyone);

    },
    toggleBotMentions() {
        this.settings.store.toggle = !this.settings.store.toggle;
    }

});
