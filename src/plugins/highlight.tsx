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

import { addBlacklist, addRule, removeBlacklist, removeRule } from "@api/Markdown";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy, findStoreLazy } from "@webpack";
import { Message } from "discord-types/general";

const settings = definePluginSettings({
    words: {
        type: OptionType.LIST,
        description: "Keywords (case insensitive)",
    },
    blacklist: {
        type: OptionType.LIST,
        description: "Blacklisted keywords",
    },
    mutedWhitelist: {
        type: OptionType.LIST,
        description: "Muted Channel/Guild Whitelist (IDs)",
    },
    bypassDoNotDisturb: {
        type: OptionType.BOOLEAN,
        description: "",
        default: false,
    },
});

const AuthenticationStore = findStoreLazy("AuthenticationStore");
const UserGuildSettingsStore = findStoreLazy("UserGuildSettingsStore");
const ChannelStore = findStoreLazy("ChannelStore");
const SelfPresenceStore = findStoreLazy("SelfPresenceStore");

const StatusTypes = findByPropsLazy("DND");

export default definePlugin({
    name: "Highlight",
    description: "Keyword notifier",
    authors: [Devs.Cyn],
    dependencies: ["MarkdownAPI"],
    patches: [
        // notification sound
        {
            find: '"NotificationTextUtils"',
            replacement: {
                match: /.SUPPRESS_NOTIFICATIONS\)\)return!1;/,
                replace: "$&if($self.shouldNotify(arguments[0],arguments[1]))return!0;"
            }
        },

        // visual mention
        {
            find: '.THREAD_STARTER_MESSAGE,"Message must be a thread starter message"',
            replacement: {
                match: /(\(\)\.mentioned,)(\i)\.mentioned&&/,
                replace: "$1($2.mentioned||$self.hasKeyword($2))&&",
            }
        },

        // add to ReadStateStore
        {
            find: 'displayName="ReadStateStore"',
            replacement: {
                match: /if\((!\(null!=(.)\.author)/,
                replace: "if($self.hasKeyword($2,arguments[0].channelId)||$1",
            },
        },
    ],

    settings,

    getKeywords(): string[] {
        return settings.store.words ?? [];
    },
    getBlacklist(): string[] {
        return settings.store.blacklist ?? [];
    },
    getKeywordsForRegex(): string {
        return this.getKeywords().map(word => word.replace(/[[\]/{}()*+?.\\^$|]/g, "\\$&")).join("|");
    },
    getBlacklistForRegex(): string {
        return this.getBlacklist().map(word => word.replace(/[[\]/{}()*+?.\\^$|]/g, "\\$&")).join("|");
    },
    isWhitelisted(id: string): boolean {
        const whitelist = settings.store.mutedWhitelist ?? [];
        return whitelist.includes(id);
    },

    hasKeyword(message: Message, channelId?: string) {
        const words = this.getKeywordsForRegex();
        const blacklist = this.getBlacklistForRegex();

        if (channelId != null) {
            const channel = ChannelStore.getChannel(channelId);
            if (
                (UserGuildSettingsStore.isChannelMuted(channel.guild_id, channelId) && !this.isWhitelisted(channelId)) ||
                (channel.guild_id != null && UserGuildSettingsStore.isMuted(channel.guild_id) && !this.isWhitelisted(channel.guild_id))
            )
                return false;
        }

        if (words === "") return false;
        if (message.author?.id === AuthenticationStore.getId()) return false;

        const wordsRegex = new RegExp(`\\b(${words})\\b`, "gi");
        const blacklistRegex = new RegExp(`(${words})`, "gi");

        return wordsRegex.test(message.content) && (blacklist !== "" ? !blacklistRegex.test(message.content) : true);
    },
    shouldNotify(message: Message, channelId: string) {
        if (SelfPresenceStore.getStatus() === StatusTypes.DND && !settings.store.bypassDoNotDisturb) return false;

        return this.hasKeyword(message, channelId);
    },

    start() {
        const self = this;
        addRule(
            "highlight",
            rules => ({
                order: rules.text.order - 1,
                match(text, state) {
                    const words = self.getKeywordsForRegex();
                    if (state.vc_highlight || words === "") return null;

                    return new RegExp(`^(${words})\\b`, "i").exec(text);
                },
                parse(capture, parse, state) {
                    state.vc_highlight = true;
                    const node = {
                        content: parse(capture[1], state),
                        type: "vc_highlight",
                        originalMatch: capture[0],
                    };
                    delete state.vc_highlight;
                    return node;
                },
                react(node, recurseOutput, state) {
                    return (
                        <span className="highlight">
                            {recurseOutput(node.content, state)}
                        </span>
                    );
                },
            }),
            {
                type: "inlineStyle",
                before: "",
                after: "",
            },
            "highlight"
        );
        addBlacklist("INLINE_REPLY_RULES", "highlight");
    },
    stop() {
        removeRule("highlight");
        removeBlacklist("INLINE_REPLY_RULES", "highlight");
    },
});
