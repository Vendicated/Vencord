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

import { Notices } from "@api/index";
import { findByPropsLazy } from "@webpack";
import { NavigationRouter } from "@webpack/common";
import { Channel, Guild } from "discord-types/general";

import settings from "./settings";
import SimpleGroupChannel from "./types/SimpleGroupChannel";
import SimpleGuild from "./types/SimpleGuild";

const DMStore = findByPropsLazy("getSortedPrivateChannels");
const GuildStore = findByPropsLazy("getGuilds", "getGuild");
const Notifications = findByPropsLazy("showNotification", "requestPermission");

const guilds = new Map<string, SimpleGuild>();
const groups = new Map<string, SimpleGroupChannel>();

export function notify(text: string, icon?: string) {
    if (!document.hasFocus() && settings.store.notifications) {
        Notifications.showNotification(icon, "Relationship Notifier", text, {
            onClick: () => NavigationRouter.transitionTo("/channels/@me")
        }, {});
    }
    Notices.showNotice(text, "OK", () => Notices.popNotice());
}

export function getGuild(id: string) {
    return guilds.get(id);
}

export function deleteGuild(id: string) {
    guilds.delete(id);
}

export function syncGuilds() {
    const currentGuilds: [string, Guild][] = Object.entries(GuildStore.getGuilds());
    for (const [id, guild] of currentGuilds) {
        guilds.set(id, {
            id,
            name: guild.name,
            iconURL: guild.icon ? `https://cdn.discordapp.com/icons/${id}/${guild.icon}.png` : undefined
        });
    }
}

export function getGroup(id: string) {
    return groups.get(id);
}

export function deleteGroup(id: string) {
    groups.delete(id);
}

export function syncGroups() {
    const currentChannels: Channel[] = DMStore.getSortedPrivateChannels();
    for (const channel of currentChannels) {
        if (channel.type !== 3) continue;
        groups.set(channel.id, {
            id: channel.id,
            name: channel.name ? channel.name : channel.rawRecipients.map(r => r.username).join(", "),
            iconURL: channel.icon ? `https://cdn.discordapp.com/channel-icons/${channel.id}/${channel.icon}.png` : undefined
        });
    }
}
