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
import { AckEvent, CreateEvent, GuildSettings, ReadyEvent, UpdateEvent } from "./types";

const GUILD_NEW_NOTIFY = 1 << 11;
const CHANNEL_NEW_NOTIFY = 1 << 10;

export class DiscordNotifier extends EventTarget {
    state: {
        userId: string;
        newUnread: boolean;
        ignoredUsers: string[];
        unread: Record<string, {
            id: string;
            ping: boolean;
        }>;
        channels: Map<string, { guild: string | null; muted: boolean; }>;
        guilds: Map<string, {
            muted: boolean;
            unread: boolean;
            suppress_roles: boolean;
            suppress_everyone: boolean;
            roles: string[];
        }>;
    };
    gateway: GateWay;

    constructor(token: string) {
        super();
        this.gateway = new GateWay(token);
        this.state = {
            userId: "",
            newUnread: false,
            ignoredUsers: [],
            unread: {},
            channels: new Map(),
            guilds: new Map(),
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

    getMutedChannel(muted: boolean, flags: number) {
        if (!this.state.newUnread) {
            return muted;
        }
        if (muted) {
            return true;
        }
        return !!(flags & CHANNEL_NEW_NOTIFY);
    }

    handleServerSettings(settings: GuildSettings | undefined) {
        if (settings === undefined) {
            return;
        }
        if (!settings.guild_id) {
            return;
        }
        const guild = this.state.guilds.get(settings.guild_id);
        this.state.guilds.set(settings.guild_id, {
            muted: settings.muted,
            unread: !!(settings.flags & GUILD_NEW_NOTIFY),
            suppress_everyone: settings.suppress_everyone,
            suppress_roles: settings.suppress_roles,
            roles: guild?.roles ?? [],
        });
        settings.channel_overrides.forEach((override) => {
            this.state.channels.set(override.channel_id, {
                guild: settings.guild_id,
                muted: this.getMutedChannel(override.muted, override.flags)
            });
            if (override.muted && override.channel_id in this.state.unread) {
                delete this.state.unread[override.channel_id];
            }
        });
    }

    checkUnread() {
        if (Object.keys(this.state.unread).length == 0) {
            this.dispatchEvent(new CustomEvent('state', { detail: { status: 'clear', id: this.state.userId } }));
            return;
        }
        if (!Object.values(this.state.unread).some((v) => v.ping)) {
            this.dispatchEvent(new CustomEvent('state', { detail: { status: 'badge', id: this.state.userId } }));
            return;
        }
        this.dispatchEvent(new CustomEvent('state', { detail: { status: 'ping', id: this.state.userId } }));
    }

    mentionsSelf(message: CreateEvent) {
        if (message.mentions.some((e) => e.id == this.state.userId)) {
            return true;
        }
        if (!message.guild_id) {
            return false;
        }
        const guild = this.state.guilds.get(message.guild_id);
        if (message.mention_everyone && !guild?.suppress_everyone) {
            return true;
        }
        if (
            message.mention_roles.length > 0 &&
            !guild?.suppress_roles &&
            message.mention_roles.some((v) => guild?.roles.includes(v))
        ) {
            return true;
        }
        return false;
    }

    isUnread(message: CreateEvent) {
        if (!message.guild_id) {
            return false;
        }
        const guild = this.state.guilds.get(message.guild_id);
        if (!guild || guild.muted) {
            return false;
        }
        const channel = this.state.channels.get(message.channel_id);
        if (!channel) {
            if (this.state.newUnread) {
                return guild.unread;
            }
            return true;
        }
        if (this.state.newUnread && !channel.muted) {
            return guild.unread;
        }
        return !channel.muted;
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
        if (ready.notification_settings.flags == 16) {
            this.state.newUnread = true;
        }
        this.state.channels = new Map(
            //@ts-expect-error Typescript doesn't like maps
            ready.user_guild_settings.map((server) => server.channel_overrides.map((override) => [
                override.channel_id,
                {
                    guild: server.guild_id,
                    muted: this.getMutedChannel(override.muted, override.flags)
                }
            ])
            ).flat(1)
        );
        this.state.guilds = new Map(
            ready.guilds
                .map((guild) => {
                    const settings = ready.user_guild_settings.find((v) => v.guild_id === guild.id);
                    if (!settings) {
                        return [guild.id, { muted: false, unread: false, suppress_roles: false, suppress_everyone: false, roles: [] }];
                    }
                    return [guild.id, {
                        muted: settings.muted,
                        unread: !!(settings.flags & GUILD_NEW_NOTIFY),
                        suppress_roles: settings.suppress_roles,
                        suppress_everyone: settings.suppress_everyone,
                        roles: guild.members.find((v) => v.user.id == this.state.userId)?.roles ?? []
                    }];
                })
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
            } else if (!(message.channel_id in this.state.unread) && this.isUnread(message)) {
                this.state.unread[message.channel_id] = {
                    id: message.id,
                    ping: false
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

    updateEvent(update: UpdateEvent) {
        switch (update.event) {
            case "USER_GUILD_SETTINGS_UPDATE":
                {
                    const data = update.data as GuildSettings;
                    if (data.guild_id === null) {
                        this.handleDMSettings(data);
                        return;
                    }
                    this.handleServerSettings(data);
                    break;
                }
            case "CHANNEL_DELETE": {
                const data = update.data as { id: string; guild_id: string | null; };
                if (this.state.channels.has(data.id)) {
                    this.state.channels.delete(data.id);
                }
                break;
            }
            case "GUILD_DELETE": {
                const data = update.data as { guild_id: string; };
                this.state.guilds.delete(data.guild_id);
                break;
            }
            case "GUILD_MEMBER_UPDATE": {
                const data = update.data as { guild_id: string; roles: string[]; };
                const guild = this.state.guilds.get(data.guild_id);
                if (!guild) {
                    return;
                }
                guild.roles = data.roles;
                break;
            }
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
