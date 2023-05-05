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

import { definePluginSettings } from "@api/settings";
import { Devs } from "@utils/constants";
import { proxyLazy } from "@utils/proxyLazy.js";
import definePlugin, { OptionType } from "@utils/types";
import { find, findByPropsLazy } from "@webpack";
import { ChannelStore, GuildStore } from "@webpack/common";
import { Channel, Message, User } from "discord-types/general";

type PermissionName = "CREATE_INSTANT_INVITE" | "KICK_MEMBERS" | "BAN_MEMBERS" | "ADMINISTRATOR" | "MANAGE_CHANNELS" | "MANAGE_GUILD" | "CHANGE_NICKNAME" | "MANAGE_NICKNAMES" | "MANAGE_ROLES" | "MANAGE_WEBHOOKS" | "MANAGE_GUILD_EXPRESSIONS" | "CREATE_GUILD_EXPRESSIONS" | "VIEW_AUDIT_LOG" | "VIEW_CHANNEL" | "VIEW_GUILD_ANALYTICS" | "VIEW_CREATOR_MONETIZATION_ANALYTICS" | "MODERATE_MEMBERS" | "SEND_MESSAGES" | "SEND_TTS_MESSAGES" | "MANAGE_MESSAGES" | "EMBED_LINKS" | "ATTACH_FILES" | "READ_MESSAGE_HISTORY" | "MENTION_EVERYONE" | "USE_EXTERNAL_EMOJIS" | "ADD_REACTIONS" | "USE_APPLICATION_COMMANDS" | "MANAGE_THREADS" | "CREATE_PUBLIC_THREADS" | "CREATE_PRIVATE_THREADS" | "USE_EXTERNAL_STICKERS" | "SEND_MESSAGES_IN_THREADS" | "CONNECT" | "SPEAK" | "MUTE_MEMBERS" | "DEAFEN_MEMBERS" | "MOVE_MEMBERS" | "USE_VAD" | "PRIORITY_SPEAKER" | "STREAM" | "USE_EMBEDDED_ACTIVITIES" | "USE_SOUNDBOARD" | "USE_EXTERNAL_SOUNDS" | "REQUEST_TO_SPEAK" | "MANAGE_EVENTS" | "CREATE_EVENTS";

interface Tag {
    // name used for identifying, must be alphanumeric + underscores
    name: string;
    // name shown on the tag itself, can be anything probably; automatically uppercase'd
    displayName: string;
    description: string;
    permissions?: PermissionName[];
    condition?(message: Message | null, user: User, channel: Channel): boolean;
}

const CLYDE_ID = "1081004946872352958";

// PermissionStore.computePermissions is not the same function and doesn't work here
const PermissionUtil = findByPropsLazy("computePermissions", "canEveryoneRole") as {
    computePermissions({ ...args }): bigint;
};

const Permissions = findByPropsLazy("SEND_MESSAGES", "VIEW_CREATOR_MONETIZATION_ANALYTICS") as Record<PermissionName, bigint>;
const Tags = proxyLazy(() => find(m => m.Types?.[0] === "BOT").Types) as Record<string, number>;

const isWebhook = (message: Message, user: User) => !!message?.webhookId && user.isNonUserBot();

const tags: Tag[] = [
    {
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
        name: "VOICE_MODERATOR",
        displayName: "VC Mod",
        description: "Can manage voice chats",
        permissions: ["MOVE_MEMBERS", "MUTE_MEMBERS", "DEAFEN_MEMBERS"]
    }
];

const settings = definePluginSettings({
    dontShowForBots: {
        description: "Don't show tags (not including the webhook tag) for bots",
        type: OptionType.BOOLEAN
    },
    dontShowBotTag: {
        description: "Don't show [BOT] text for bots with other tags (verified bots will still have checkmark)",
        type: OptionType.BOOLEAN
    },
    ...Object.fromEntries(tags.map(({ name, displayName, description }) => [
        `visibility_${name}`, {
            description: `Show ${displayName} tags (${description})`,
            type: OptionType.SELECT,
            options: [
                {
                    label: "Always",
                    value: "always",
                    default: true
                }, {
                    label: "Only in chat",
                    value: "chat"
                }, {
                    label: "Only in member list and profiles",
                    value: "not-chat"
                }, {
                    label: "Never",
                    value: "never"
                }
            ]
        }
    ]))
});

export default definePlugin({
    name: "MoreUserTags",
    description: "Adds tags for webhooks and moderative roles (owner, admin, etc.)",
    authors: [Devs.Cyn, Devs.TheSun, Devs.RyanCaoDev],
    settings,
    patches: [
        // add tags to the tag list
        {
            find: '.BOT=0]="BOT"',
            replacement: [
                // add tags to the exported tags list (the Tags variable here)
                {
                    match: /(\i)\[.\.BOT=0\]="BOT";/,
                    replace: "$&$1=$self.addTagVariants($1);"
                },
                // make the tag show the right text
                {
                    match: /(switch\((\i)\){.+?)case (\i)\.BOT:default:(\i)=(\i\.\i\.Messages)\.BOT_TAG_BOT/,
                    replace: (_, origSwitch, variant, tags, displayedText, strings) =>
                        `${origSwitch}default:{${displayedText} = $self.getTagText(${tags}[${variant}], ${strings})}`
                },
                // show OP tags correctly
                {
                    match: /(\i)=(\i)===\i\.ORIGINAL_POSTER/,
                    replace: "$1=$self.isOPTag($2)"
                },
                // add HTML data attributes (for easier theming)
                {
                    match: /children:\[(?=\i,\(0,\i\.jsx\)\("span",{className:\i\(\)\.botText,children:(\i)}\)\])/,
                    replace: "'data-tag':$1.toLowerCase(),children:["
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
                match: /,botType:(\i\((\i)\)),/g,
                replace: ",botType:$self.getTag({user:$2,channelId:arguments[0].moreTags_channelId,origType:$1,location:'not-chat'}),"
            }
        },
    ],

    getPermissions(user: User, channel: Channel): string[] {
        const guild = GuildStore.getGuild(channel?.guild_id);
        if (!guild) return [];

        const permissions = PermissionUtil.computePermissions({ user, context: guild, overwrites: channel.permissionOverwrites });
        return Object.entries(Permissions)
            .map(([perm, permInt]) =>
                permissions & permInt ? perm : ""
            )
            .filter(Boolean);
    },

    addTagVariants(val: any /* i cant think of a good name */) {
        let i = 100;
        tags.forEach(({ name }) => {
            val[name] = ++i;
            val[i] = name;
            val[`${name}-BOT`] = ++i;
            val[i] = `${name}-BOT`;
            val[`${name}-OP`] = ++i;
            val[i] = `${name}-OP`;
        });
        return val;
    },

    isOPTag: (tag: number) => tag === Tags.ORIGINAL_POSTER || tags.some(t => tag === Tags[`${t.name}-OP`]),

    getTagText(passedTagName: string, strings: Record<string, string>) {
        if (!passedTagName) return "BOT";
        const [tagName, variant] = passedTagName.split("-");
        const tag = tags.find(({ name }) => tagName === name);
        if (!tag) return "BOT";
        if (variant === "BOT" && tagName !== "WEBHOOK" && this.settings.store.dontShowForBots) return strings.BOT_TAG_BOT;

        switch (variant) {
            case "OP":
                return `${strings.BOT_TAG_FORUM_ORIGINAL_POSTER} • ${tag.displayName}`;
            case "BOT":
                return `${strings.BOT_TAG_BOT} • ${tag.displayName}`;
            default:
                return tag.displayName;
        }
    },

    getTag({
        message, user, channelId, origType, location, channel
    }: {
        message?: Message,
        user: User,
        channel?: Channel & { isForumPost(): boolean; },
        channelId?: string;
        origType?: number;
        location: string;
    }): number | null {
        if (location === "chat" && user.id === "1")
            return Tags.OFFICIAL;
        if (user.id === CLYDE_ID)
            return Tags.AI;

        let type = typeof origType === "number" ? origType : null;

        channel ??= ChannelStore.getChannel(channelId!) as any;
        if (!channel) return type;

        const settings = this.settings.store;
        const perms = this.getPermissions(user, channel);

        for (const tag of tags) {
            switch (settings[`visibility_${tag.name}`]) {
                case "always":
                case location:
                    break;
                default:
                    continue;
            }

            if (
                tag.permissions?.some(perm => perms.includes(perm)) ||
                (tag.condition?.(message!, user, channel))
            ) {
                if (channel.isForumPost() && channel.ownerId === user.id)
                    type = Tags[`${tag.name}-OP`];
                else if (user.bot && !isWebhook(message!, user) && !settings.dontShowBotTag)
                    type = Tags[`${tag.name}-BOT`];
                else
                    type = Tags[tag.name];
                break;
            }
        }

        return type;
    }
});
