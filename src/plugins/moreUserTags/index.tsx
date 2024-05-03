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

import { definePluginSettings } from "@api/Settings";
import { Flex } from "@components/Flex";
import { Devs } from "@utils/constants";
import { Margins } from "@utils/margins";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy, findLazy } from "@webpack";
import { Card, ChannelStore, Forms, GuildStore, PermissionsBits, Switch, TextInput, Tooltip, useState } from "@webpack/common";
import { RC } from "@webpack/types";
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

interface TagSetting {
    text: string;
    showInChat: boolean;
    showInNotChat: boolean;
}
interface TagSettings {
    WEBHOOK: TagSetting,
    OWNER: TagSetting,
    ADMINISTRATOR: TagSetting,
    MODERATOR_STAFF: TagSetting,
    MODERATOR: TagSetting,
    VOICE_MODERATOR: TagSetting,
    [k: string]: TagSetting;
}

// PermissionStore.computePermissions is not the same function and doesn't work here
const PermissionUtil = findByPropsLazy("computePermissions", "canEveryoneRole") as {
    computePermissions({ ...args }): bigint;
};

const Tag = findLazy(m => m.Types?.[0] === "BOT") as RC<{ type?: number, className?: string, useRemSizes?: boolean; }> & { Types: Record<string, number>; };

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
const defaultSettings = Object.fromEntries(
    tags.map(({ name, displayName }) => [name, { text: displayName, showInChat: true, showInNotChat: true }])
) as TagSettings;

function SettingsComponent(props: { setValue(v: any): void; }) {
    settings.store.tagSettings ??= defaultSettings;

    const [tagSettings, setTagSettings] = useState(settings.store.tagSettings as TagSettings);
    const setValue = (v: TagSettings) => {
        setTagSettings(v);
        props.setValue(v);
    };

    return (
        <Flex flexDirection="column">
            {tags.map(t => (
                <Card style={{ padding: "1em 1em 0" }}>
                    <Forms.FormTitle style={{ width: "fit-content" }}>
                        <Tooltip text={t.description}>
                            {({ onMouseEnter, onMouseLeave }) => (
                                <div
                                    onMouseEnter={onMouseEnter}
                                    onMouseLeave={onMouseLeave}
                                >
                                    {t.displayName} Tag <Tag type={Tag.Types[t.name]} />
                                </div>
                            )}
                        </Tooltip>
                    </Forms.FormTitle>

                    <TextInput
                        type="text"
                        value={tagSettings[t.name]?.text ?? t.displayName}
                        placeholder={`Text on tag (default: ${t.displayName})`}
                        onChange={v => {
                            tagSettings[t.name].text = v;
                            setValue(tagSettings);
                        }}
                        className={Margins.bottom16}
                    />

                    <Switch
                        value={tagSettings[t.name]?.showInChat ?? true}
                        onChange={v => {
                            tagSettings[t.name].showInChat = v;
                            setValue(tagSettings);
                        }}
                        hideBorder
                    >
                        Show in messages
                    </Switch>

                    <Switch
                        value={tagSettings[t.name]?.showInNotChat ?? true}
                        onChange={v => {
                            tagSettings[t.name].showInNotChat = v;
                            setValue(tagSettings);
                        }}
                        hideBorder
                    >
                        Show in member list and profiles
                    </Switch>
                </Card>
            ))}
        </Flex>
    );
}

const settings = definePluginSettings({
    dontShowForBots: {
        description: "Don't show extra tags for bots (excluding webhooks)",
        type: OptionType.BOOLEAN
    },
    dontShowBotTag: {
        description: "Only show extra tags for bots / Hide [BOT] text",
        type: OptionType.BOOLEAN
    },
    tagSettings: {
        type: OptionType.COMPONENT,
        component: SettingsComponent,
        description: "fill me",
    }
});

export default definePlugin({
    name: "MoreUserTags",
    description: "Adds tags for webhooks and moderative roles (owner, admin, etc.)",
    authors: [Devs.Cyn, Devs.TheSun, Devs.RyanCaoDev, Devs.LordElias, Devs.AutumnVN],
    settings,
    patches: [
        // add tags to the tag list
        {
            find: "BotTagTypes:",
            replacement: {
                match: /\((\i)=\{\}\)\)\[(\i)\.BOT/,
                replace: "($1=$self.getTagTypes()))[$2.BOT"
            }
        },
        {
            find: ".DISCORD_SYSTEM_MESSAGE_BOT_TAG_TOOLTIP,",
            replacement: [
                // make the tag show the right text
                {
                    match: /(switch\((\i)\){.+?)case (\i(?:\.\i)?)\.BOT:default:(\i)=.{0,40}(\i\.\i\.Messages)\.APP_TAG/,
                    replace: (_, origSwitch, variant, tags, displayedText, strings) =>
                        `${origSwitch}default:{${displayedText} = $self.getTagText(${tags}[${variant}], ${strings})}`
                },
                // show OP tags correctly
                {
                    match: /(\i)=(\i)===\i(?:\.\i)?\.ORIGINAL_POSTER/,
                    replace: "$1=$self.isOPTag($2)"
                },
                // add HTML data attributes (for easier theming)
                {
                    match: /.botText,children:(\i)}\)]/,
                    replace: "$&,'data-tag':$1.toLowerCase()"
                }
            ],
        },
        // in messages
        {
            find: "renderSystemTag:",
            replacement: {
                match: /;return\((\(null==\i\?void 0:\i\.isSystemDM\(\).+?.Types.ORIGINAL_POSTER\)),null==(\i)\)/,
                replace: ";$1;$2=$self.getTag({...arguments[0],origType:$2,location:'chat'});return $2 == null"
            }
        },
        // in the member list
        {
            find: ".Messages.GUILD_OWNER,",
            replacement: {
                match: /(?<type>\i)=\(null==.{0,100}\.BOT;return null!=(?<user>\i)&&\i\.bot/,
                replace: "$<type> = $self.getTag({user: $<user>, channel: arguments[0].channel, origType: $<user>.bot ? 0 : null, location: 'not-chat' }); return typeof $<type> === 'number'"
            }
        },
        // pass channel id down props to be used in profiles
        {
            find: ".hasAvatarForGuild(null==",
            replacement: {
                match: /(?=usernameIcon:)/,
                replace: "moreTags_channelId:arguments[0].channelId,"
            }
        },
        {
            find: 'copyMetaData:"User Tag"',
            replacement: {
                match: /(?=,botClass:)/,
                replace: ",moreTags_channelId:arguments[0].moreTags_channelId"
            }
        },
        // in profiles
        {
            find: ",overrideDiscriminator:",
            replacement: [
                {
                    // prevent channel id from getting ghosted
                    // it's either this or extremely long lookbehind
                    match: /user:\i,nick:\i,/,
                    replace: "$&moreTags_channelId,"
                }, {
                    match: /,botType:(\i\((\i)\)),/g,
                    replace: ",botType:$self.getTag({user:$2,channelId:moreTags_channelId,origType:$1,location:'not-chat'}),"
                }
            ]
        },
    ],

    start() {
        if (settings.store.tagSettings) return;
        // @ts-ignore
        if (!settings.store.visibility_WEBHOOK) settings.store.tagSettings = defaultSettings;
        else {
            const newSettings = { ...defaultSettings };
            Object.entries(Vencord.PlainSettings.plugins.MoreUserTags).forEach(([name, value]) => {
                const [setting, tag] = name.split("_");
                if (setting === "visibility") {
                    switch (value) {
                        case "always":
                            // its the default
                            break;
                        case "chat":
                            newSettings[tag].showInNotChat = false;
                            break;
                        case "not-chat":
                            newSettings[tag].showInChat = false;
                            break;
                        case "never":
                            newSettings[tag].showInChat = false;
                            newSettings[tag].showInNotChat = false;
                            break;
                    }
                }
                settings.store.tagSettings = newSettings;
                delete Vencord.Settings.plugins.MoreUserTags[name];
            });
        }
    },

    getPermissions(user: User, channel: Channel): string[] {
        const guild = GuildStore.getGuild(channel?.guild_id);
        if (!guild) return [];

        const permissions = PermissionUtil.computePermissions({ user, context: guild, overwrites: channel.permissionOverwrites });
        return Object.entries(PermissionsBits)
            .map(([perm, permInt]) =>
                permissions & permInt ? perm : ""
            )
            .filter(Boolean);
    },

    getTagTypes() {
        const obj = {};
        let i = 100;
        tags.forEach(({ name }) => {
            obj[name] = ++i;
            obj[i] = name;
            obj[`${name}-BOT`] = ++i;
            obj[i] = `${name}-BOT`;
            obj[`${name}-OP`] = ++i;
            obj[i] = `${name}-OP`;
        });
        return obj;
    },

    isOPTag: (tag: number) => tag === Tag.Types.ORIGINAL_POSTER || tags.some(t => tag === Tag.Types[`${t.name}-OP`]),

    getTagText(passedTagName: string, strings: Record<string, string>) {
        if (!passedTagName) return strings.APP_TAG;
        const [tagName, variant] = passedTagName.split("-");
        const tag = tags.find(({ name }) => tagName === name);
        if (!tag) return strings.APP_TAG;
        if (variant === "BOT" && tagName !== "WEBHOOK" && this.settings.store.dontShowForBots) return strings.APP_TAG;

        const tagText = settings.store.tagSettings?.[tag.name]?.text || tag.displayName;
        switch (variant) {
            case "OP":
                return `${strings.BOT_TAG_FORUM_ORIGINAL_POSTER} • ${tagText}`;
            case "BOT":
                return `${strings.APP_TAG} • ${tagText}`;
            default:
                return tagText;
        }
    },

    getTag({
        message, user, channelId, origType, location, channel
    }: {
        message?: Message,
        user: User & { isClyde(): boolean; },
        channel?: Channel & { isForumPost(): boolean; },
        channelId?: string;
        origType?: number;
        location: "chat" | "not-chat";
    }): number | null {
        if (!user)
            return null;
        if (location === "chat" && user.id === "1")
            return Tag.Types.OFFICIAL;
        if (user.isClyde())
            return Tag.Types.AI;

        let type = typeof origType === "number" ? origType : null;

        channel ??= ChannelStore.getChannel(channelId!) as any;
        if (!channel) return type;

        const settings = this.settings.store;
        const perms = this.getPermissions(user, channel);

        for (const tag of tags) {
            if (location === "chat" && !settings.tagSettings[tag.name].showInChat) continue;
            if (location === "not-chat" && !settings.tagSettings[tag.name].showInNotChat) continue;

            if (
                tag.permissions?.some(perm => perms.includes(perm)) ||
                (tag.condition?.(message!, user, channel))
            ) {
                if (channel.isForumPost() && channel.ownerId === user.id)
                    type = Tag.Types[`${tag.name}-OP`];
                else if (user.bot && !isWebhook(message!, user) && !settings.dontShowBotTag)
                    type = Tag.Types[`${tag.name}-BOT`];
                else
                    type = Tag.Types[tag.name];
                break;
            }
        }
        return type;
    }
});
