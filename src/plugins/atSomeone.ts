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

import { addPreSendListener, removePreSendListener } from "@api/MessageEvents";
import { definePluginSettings } from "@api/settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, GuildMemberStore, SelectedChannelStore } from "@webpack/common";

const settings = definePluginSettings({
    string: {
        type: OptionType.STRING,
        description: "The string to replace with a random mention",
        default: "@someone",
        isValid(value: string) {
            return (value.length > 0);
        }
    }
});

export default definePlugin({
    name: "AtSomeone",
    description: "@someone to mention a random person",
    authors: [Devs.AutumnVN],
    dependencies: ["MessageEventsAPI"],
    settings,

    escapeRegex(str: string) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    },

    start() {
        this.preSend = addPreSendListener((_, msg) => {
            const { string } = settings.store;
            if (!msg.content.includes(string)) return;
            const channel = ChannelStore.getChannel(SelectedChannelStore.getChannelId());
            const members = channel.guild_id ? GuildMemberStore.getMemberIds(channel.guild_id) : channel.recipients;
            const regex = new RegExp(this.escapeRegex(string), "g");
            msg.content.match(regex)?.forEach(() => {
                msg.content = msg.content.replace(string, `<@${members[Math.floor(Math.random() * members.length)]}>`);
            });
        });
    },

    stop() {
        removePreSendListener(this.preSend);
    }
});
