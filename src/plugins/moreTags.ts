/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { definePluginSettings, migratePluginSettings } from "@api/settings";
import { Devs } from "@utils/constants";
import { proxyLazy } from "@utils/proxyLazy.js";
import definePlugin, { OptionType } from "@utils/types";
import { find, findByPropsLazy, waitFor, } from "@webpack";
import { ChannelStore, GuildStore } from "@webpack/common";
import { Channel, Message, User } from "discord-types/general";

// PermissionStore.computePermissions is not the same function and doesn't work here
let computePermissions: ({ ...args }) => bigint;
waitFor(["computePermissions", "canEveryoneRole"], m => ({ computePermissions } = m));
const Permissions: Record<string, bigint> = findByPropsLazy("SEND_MESSAGES", "VIEW_CREATOR_MONETIZATION_ANALYTICS");
const Tags: Record<string, number> = proxyLazy(() => find(m => m.Types?.[0] === "BOT").Types);

const isWebhook = (message, user) => message?.webhookId && user.isNonUserBot();

interface Tag {
    // name used for identifying, must be alphanumeric + underscores
    name: string;
    // name shown on the tag itself, can be anything probably; automatically uppercase'd
    displayName: string;
    description: string;
    permissions?: string[];
    condition?: (message: Message | null, user: User, channel: Channel) => boolean;
}
const tags: Tag[] = [{
    name: "WEBHOOK",
    displayName: "Webhook",
    description: "Messages sent by webhooks",
    condition: isWebhook
}, {
    name: "OWNER",
    displayName: "Owner",
    description: "Owns the server",
    condition: (_, user, channel) => GuildStore.getGuild(channel?.guild_id)?.ownerId === user.id
}, {
    name: "ADMINISTRATOR",
    displayName: "Admin",
    description: "Has the administrator permission",
    permissions: ["ADMINISTRATOR"]
}, {
    name: "MODERATOR_STAFF",
    displayName: "Staff",
    description: "Can manage the server, channels or roles",
    permissions: ["MANAGE_GUILD", "MANAGE_CHANNELS", "MANAGE_ROLES"]
}, {
    name: "MODERATOR",
    displayName: "Mod",
    description: "Can manage messages or kick/ban people",
    permissions: ["MANAGE_MESSAGES", "KICK_MEMBERS", "BAN_MEMBERS"]
}, {
    name: "MODERATOR_VC",
    displayName: "VC Mod",
    description: "Can manage voice chats",
    permissions: ["MOVE_MEMBERS", "MUTE_MEMBERS", "DEAFEN_MEMBERS"]
    // reversed so higher entries have priority over lower entries
}].reverse();

let i = 999;
// e[e.BOT=0]="BOT";
const addTagVar = (name: string, types: string) => `${types}[${types}.${name}=${i--}]="${name}"`;
// case r.SERVER:T=c.Z.Messages.BOT_TAG_SERVER;break;
const addTagCase = (name: string, displayName: string, types: string, textVar: string) =>
    `case ${types}.${name}:${textVar}=${displayName};break;`;

const settings = definePluginSettings({
    dontShowBotTag: {
        description: "Don't show [BOT] text for bots with other tags (verified bots will still have checkmark)",
        type: OptionType.BOOLEAN
    },
    clydeSystemTag: {
        description: "Show system tag for Clyde",
        type: OptionType.BOOLEAN,
        default: true
    },
    ...Object.fromEntries(tags.map(t => [
        `visibility_${t.name}`, {
            description: `Show ${t.displayName} tags (${t.description})`,
            type: OptionType.SELECT,
            options: [{
                label: "Always",
                value: "always",
                default: true
            }, {
                label: "Only in chat",
                value: "chat"
            }, {
                label: "Only in memeber list and profiles",
                value: "not-chat"
            }, {
                label: "Never",
                value: "never"
            }]
        }
    ]))
});
migratePluginSettings("MoreTags", "Webhook Tags");
export default definePlugin({
    name: "MoreTags",
    description: "Adds tags for webhooks and moderative roles (owner, admin, etc.)",
    authors: [Devs.Cyn, Devs.TheSun],
    settings,
    patches: [
        // add tags to the tag list
        {
            find: '.BOT=0]="BOT"',
            replacement: [
                {
                    match: /(\i)\[.\.BOT=0\]="BOT";/,
                    replace: (orig, types) =>
                        `${tags.map(t =>
                            `${addTagVar(t.name, types)};${addTagVar(`${t.name}_OP`, types)};${addTagVar(`${t.name}_BOT`, types)};`
                        ).join("")}${orig}`
                },
                {
                    match: /case (\i)\.BOT:default:(\i)=(.{1,20})\.BOT/,
                    replace: (orig, types, text, strings) =>
                        `${tags.map(t =>
                            `${addTagCase(t.name, `"${t.displayName}"`, types, text)}\
                            ${addTagCase(`${t.name}_OP`, `${strings}.BOT_TAG_FORUM_ORIGINAL_POSTER+" • ${t.displayName}"`, types, text)}\
                            ${addTagCase(`${t.name}_BOT`, `${strings}.BOT_TAG_BOT+" • ${t.displayName}"`, types, text)}`
                        ).join("")}${orig}`
                },
                // show OP tags correctly
                {
                    match: /(\i)=(\i)===\i\.ORIGINAL_POSTER/,
                    replace: "$1=$self.isOPTag($2)"
                }
            ],
        },
        // in messages
        {
            find: ".Types.ORIGINAL_POSTER",
            replacement: {
                match: /return null==(\i)\?null:\(0,/,
                replace: "$1=$self.getTag({...arguments[0],origType:$1,location:'chat'});$&"
            }
        },
        // in the member list
        {
            find: ".renderBot=function(){",
            replacement: {
                match: /this.props.user;return null!=(\i)&&.{0,10}\?(.{0,50})\.botTag/,
                replace: "this.props.user;var type=$self.getTag({...this.props,origType:$1.bot?0:null,location:'not-chat'});\
return type!==null?$2.botTag,type"
            }
        },
        // pass channel id down props to be used in profiles
        {
            find: ".hasAvatarForGuild(null==",
            replacement: {
                match: /\.usernameSection,user/,
                replace: ".usernameSection,moreTags_channelId:arguments[0].channelId,user"
            }
        },
        {
            find: 'copyMetaData:"User Tag"',
            replacement: {
                match: /discriminatorClass:(.{1,100}),botClass:/,
                replace: "discriminatorClass:$1,moreTags_channelId:arguments[0].moreTags_channelId,botClass:"
            }
        },
        // in profiles
        {
            find: ",botType:",
            replacement: {
                match: /,botType:(\i\((\i)\)),/,
                replace: ",botType:$self.getTag({user:$2,channelId:arguments[0].moreTags_channelId,origType:$1,location:'not-chat'}),"
            }
        },
    ],

    getPermissions(user: User, channel: Channel): string[] {
        const guild = GuildStore.getGuild(channel?.guild_id);
        if (!guild) return [];
        const permissions = computePermissions({ user, context: guild, overwrites: channel.permissionOverwrites });
        return Object.entries(Permissions).map(([perm, permInt]) =>
            permissions & permInt ? perm : ""
        ).filter(Boolean);
    },

    isOPTag: (tag: number) => tag === Tags.ORIGINAL_POSTER || tags.some(t => tag === Tags[`${t.name}_OP`]),

    getTag(args: any): number | null {
        // note: everything other than user and location can be undefined
        const { message, user, channelId, origType, location } = args;
        let { channel } = args;
        let type = typeof origType === "number" ? origType : null;
        // "as any" cast because the Channel type doesn't have .isForumPost() yet
        channel ??= ChannelStore.getChannel(channelId) as any;

        const settings = this.settings.store;
        const perms = this.getPermissions(user, channel);

        if (location === "chat" && user.id === "1" && settings.clydeSystemTag) return Tags.OFFICIAL;
        tags.forEach(tag => {
            if (![location, "always"].includes(settings[`visibility_${tag.name}`])) return;

            if (tag.permissions?.find(perm => perms.includes(perm))
                || (tag.condition?.(message, user, channel))
            ) {
                if (channel.isForumPost() && channel.ownerId === user.id) type = Tags[`${tag.name}_OP`];
                else if (user.bot && !isWebhook(message, user) && !settings.dontShowBotTag) type = Tags[`${tag.name}_BOT`];
                else type = Tags[tag.name];
            }
        });
        return type;
    }
});
