/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
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

import { GateWay } from "./gateway";
import { SnowflakeUtils } from "@webpack/common";
import { AckEvent, CreateEvent, GuildSettings, ReadyEvent } from "./types";


export class DiscordNotifier extends EventTarget {
    state: {
        userId: string;
        ignoredUsers: string[];
        unread: Record<string, {
            id: string;
            ping: boolean;
        }>;
    };
    gateway: GateWay;

    constructor(token: string) {
        super();
        this.gateway = new GateWay(token);
        this.state = {
            userId: "",
            ignoredUsers: [],
            unread: {},
        };
    }

    handleDMSettings(settings: GuildSettings | undefined) {
        if (settings === undefined) {
            return;
        }
        this.state.ignoredUsers = settings.channel_overrides
            .filter((v) => v.muted)
            .map((v) => v.channel_id);
    }

    checkUnread() {
        if (Object.keys(this.state.unread).length == 0) {
            this.dispatchEvent(new CustomEvent('state', { detail: { status: 'clear', id: this.state.userId } }));
            return;
        }
        if (!Object.values(this.state.unread).some((v) => v.ping)) {
            this.dispatchEvent(new CustomEvent('state', { detail: { status: 'unread', id: this.state.userId } }));
            return;
        }
        this.dispatchEvent(new CustomEvent('state', { detail: { status: 'ping', id: this.state.userId } }));
    }

    mentionsSelf(message: { mentions: { id: string; }[]; }) {
        return message.mentions.some((e) => e.id == this.state.userId);
    }

    mutedUser(message: { channel_id: string; }) {
        return this.state.ignoredUsers.some((v) => v == message.channel_id);
    }

    checkAck(message: AckEvent) {
        if (!(message.channel_id in this.state.unread)) {
            return false;
        }
        const unread = this.state.unread[message.channel_id];
        return SnowflakeUtils.compare(unread?.id, message.message_id) < 1;
    }

    removeAck(message: AckEvent) {
        delete this.state.unread[message.channel_id];
    }

    readyEvent(ready: ReadyEvent) {
        this.state.userId = ready.user.id;
        this.state.unread = Object.fromEntries(
            ready.read_state
                .filter((e) => e.mention_count > 0)
                .map((e) => ([e.id, { id: e.last_message_id, ping: true }]))
        );
        const users = ready.user_guild_settings.find((v) => v.guild_id === null);
        this.handleDMSettings(users);
        this.checkUnread();
    }

    createEvent(message: CreateEvent) {
        if (message.author.id == this.state.userId) {
            return;
        }
        if ('guild_id' in message) {
            if (this.mentionsSelf(message)) {
                this.state.unread[message.channel_id] = {
                    id: message.id,
                    ping: true
                };
            }
            this.checkUnread();
            return;
        }
        if (this.mentionsSelf(message) || !this.mutedUser(message)) {
            this.state.unread[message.channel_id] = {
                id: message.id,
                ping: true
            };
        }
        this.checkUnread();
    }

    ackEvent(ack: AckEvent) {
        if (this.checkAck(ack)) {
            this.removeAck(ack);
        }
        this.checkUnread();
    }

    updateEvent(update: GuildSettings) {
        if (update.guild_id === null) {
            this.handleDMSettings(update);
        }
    };

    connect() {
        this.gateway.addEventListener("ready", ((e) => { this.readyEvent((e as any).detail); }));
        this.gateway.addEventListener("create", ((e) => { this.createEvent((e as any).detail); }));
        this.gateway.addEventListener("ack", ((e) => { this.ackEvent((e as any).detail); }));
        this.gateway.addEventListener("update", ((e) => { this.updateEvent((e as any).detail); }));
        this.gateway.connect();
    }

    stop() {
        this.gateway.stop();
    }
}
