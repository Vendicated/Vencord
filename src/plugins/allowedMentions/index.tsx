/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addPreSendListener, MessageExtra, removePreSendListener } from "@api/MessageEvents";
import { Flex } from "@components/Flex";
import { Devs } from "@utils/constants";
import { isNonNullish } from "@utils/guards";
import definePlugin from "@utils/types";
import { GuildStore, PermissionsBits, PermissionStore } from "@webpack/common";
import { Message } from "discord-types/general";

import { AllowedMentionsBar, AllowedMentionsProps, Mentions } from "./AllowedMentionsUI";

const sendMentionsMap = new Map<string, Mentions>();
const editMentionsMap = new Map<string, Mentions>();

export default definePlugin({
    name: "AllowedMentions",
    authors: [Devs.arHSM],
    description: "Fine grained control over whom to ping when sending or editing a message.",
    dependencies: ["MessageEventsAPI"],

    patches: [
        {
            find: "default.getEditingTextValue(",
            replacement: [
                // Make edit modal pass message object down to slate
                {
                    match: /(?<=className:\i.channelTextArea,textValue:\i,)/,
                    replace: "message: arguments[0].message,"
                }
            ]
        },
        {
            find: '"chat input type must be set"',
            replacement: [
                // set needsAllowedMentions
                {
                    match: /(?<="chat input type must be set"\);)/,
                    replace: "let needsAllowedMentions = $self.needsAllowedMentions(arguments[0].richValue, arguments[0].channel.id, arguments[0].channel.guild_id, arguments[0].message);"
                },
                // Fix the top border radius to become 0 when needsAllowedMentions is non null
                {
                    match: /(?<=hasConnectedBar\]:\i\b)/,
                    replace: "|| needsAllowedMentions,"
                },
                // Pass needsAllowedMentions to the attachedBars component
                {
                    match: /(?=activeCommand:\i,pendingReply:\i)/,
                    replace: "needsAllowedMentions,"
                },
            ]
        },
        {
            find: "useShouldShowPTONotice)(",
            replacement: [
                // Set needsAllowedMentions, channel props
                {
                    match: /(?<=activeCommand:\i,pendingReply:\i}=(\i),)/,
                    replace: "{ needsAllowedMentions, channel } = $1,"
                },
                // Pass needsAllowedMentions to reply bar, required for adding
                // allowedMentions UI when replying
                {
                    match: /(?<=null!=(\i)&&(\i).push\(\(0,\i\.jsx\)\(\i\.\i,\{reply:\i,)/,
                    replace: "needsAllowedMentions,"
                },
                // Add allowedMentions bar when not replying
                {
                    match: /(?=null!=(\i)&&(\i).push\(\(0,\i\.jsx\)\(\i\.\i,\{reply:)/,
                    replace: "null != needsAllowedMentions && null == $1 && $2.push($self.AllowedMentionsBar({ mentions:needsAllowedMentions, channel })),"
                }
            ]
        },
        {
            find: ".Messages.REPLYING_TO.format({",
            replacement: [
                // Set needsAllowedMentions, channel props
                {
                    match: /(?<=\{reply:\i,chatInputType:\i\}=(\i),)/,
                    replace: "{ needsAllowedMentions, reply: { channel } } = $1,"
                },
                // Render allowedMentions UI when needsAllowedMentions is non null
                {
                    match: /(?<="div",\{className:\i.actions,children:\[)(?=\i&&)/,
                    replace: "null != needsAllowedMentions && $self.AllowedMentionsBarInner({ mentions:needsAllowedMentions, channel, trailingSeparator: true }),",
                }
            ]
        },
        {
            find: "async editMessage(",
            replacement: [
                // Dynamically inject modified allowed_mentions prop
                {
                    match: /(?<=async editMessage\((\i),.+?allowed_mentions:)\i/,
                    replace: "$self.patchEditAllowedMentions($1, $&)"
                }
            ]
        },
        {
            find: "Messages.EDIT_TEXTAREA_HELP.format({",
            replacement: [
                // Remove entry from editMap when cancelling
                {
                    match: /(?<=Messages.EDIT_TEXTAREA_HELP.format\(\{onCancel:\(\)=>)\i\((\i\.id)\)/,
                    replace: "($self.removeEditMentionsMap($1), $&)"
                },
                // Remove entry from editMap when content is unchanged
                {
                    match: /(?<=return )(?=(\i).content!==this.props.message.content)/,
                    replace: "$1.content === this.props.message.content && $self.removeEditMentionsMap(this.props.channel.id),"
                }
            ]
        },
        {
            find: ".Messages.EVERYONE_POPOUT_BODY",
            replacement: [
                // Remove the warning popout for server members >30 and @everyone mention is off
                {
                    match: /(?<=shouldShowEveryoneGuard\(\i,(\i)\))/,
                    replace: "|| $self.shouldSkipContentWarningPopout($1.id)"
                }
            ]
        }
    ],

    // Independent allowedMentions bar
    AllowedMentionsBar(props: Omit<AllowedMentionsProps, "setMentionsForChannel">) {
        return <Flex style={{ padding: "0.45rem 1rem" }}>
            {<this.AllowedMentionsBarInner {...props} />}
        </Flex>;
    },

    // Used in reply bar patch
    AllowedMentionsBarInner(props: Omit<AllowedMentionsProps, "setMentionsForChannel">) {
        const key = `${props.mentions.everyone},${props.mentions.userIds.join(",")},${props.mentions.roleIds.join(",")}`;

        return <AllowedMentionsBar
            {...props}
            setMentionsForChannel={(channelId, mentions) => (isNonNullish(mentions.editSource) ? editMentionsMap : sendMentionsMap).set(channelId, mentions)}
            key={key}
        />;
    },

    needsAllowedMentions(richValue: any, channelId: string, guildId: string | null, message?: Message) {
        const mentions: Mentions = {
            hasEveryone: false,
            everyone: false,
            userIds: [],
            roleIds: [],
            allUsers: true,
            allRoles: true,
            editSource: undefined
        };

        const canMentionEveryone = guildId ? PermissionStore.can(PermissionsBits.MENTION_EVERYONE, GuildStore.getGuild(guildId)) : true;
        const userIds = new Set<string>();
        const roleIds = new Set<string>();

        if (!isNonNullish(richValue[0]?.children)) {
            return undefined;
        }

        for (const node of richValue[0].children) {
            switch (node.type) {
                case "userMention":
                    userIds.add(node.userId);
                    break;
                case "roleMention":
                    roleIds.add(node.roleId);
                    break;
                case "textMention":
                    if (node.name === "@everyone" || node.name === "@here") {
                        mentions.hasEveryone = canMentionEveryone;
                    }
                    break;
            }
        }

        if (isNonNullish(message)) {
            mentions.everyone = message.mentionEveryone;
            // Provide default set of ids to be used in AllowedMentionsBar
            // filter these cause we don't want "ghost" ids (ids in original
            // text but not in the edited)
            const users = new Set(message.mentions.filter(userId => userIds.has(userId)));
            const roles = new Set(message.mentionRoles.filter(roleId => roleIds.has(roleId)));
            // Set these to false, we need complete verbosity over editing.
            // These must be true if mentioned count is more than 100 cause api
            // can only handle 100 explicit ids, beyond that you have to cope
            // with pinging all
            mentions.allUsers = users.size > 100;
            mentions.allRoles = roles.size > 100;
            mentions.editSource = {
                users: users.size > 100 ? new Set() : users,
                roles: roles.size > 100 ? new Set() : roles,
            };
        }

        mentions.userIds = Array.from(userIds);
        mentions.roleIds = Array.from(roleIds);

        return !mentions.hasEveryone
            && mentions.userIds.length === 0
            && mentions.roleIds.length === 0
            ? (sendMentionsMap.delete(channelId), undefined) : mentions;
    },

    setAllowedMentions(channelId: string, extra: { replyOptions: MessageExtra["replyOptions"]; }, type: "edit" | "send") {
        const mentions = (type === "edit" ? editMentionsMap : sendMentionsMap).get(channelId);

        if (typeof mentions === "undefined") return;
        // Remove the entry since it's useless after the message is sent
        (type === "edit" ? editMentionsMap : sendMentionsMap).delete(channelId);


        // @ts-ignore setting these below
        extra.replyOptions.allowedMentions ??= {};

        const parse: ("everyone" | "users" | "roles")[] = [];
        // "everyone" includes @here mentions too
        mentions.everyone && parse.push("everyone");

        // These are mutually exclusive fields, either all or some
        if (mentions.allUsers) {
            parse.push("users");
        } else {
            extra.replyOptions.allowedMentions!.users = Array.from(mentions.userIds);
        }
        if (mentions.allRoles) {
            parse.push("roles");
        } else {
            extra.replyOptions.allowedMentions!.roles = Array.from(mentions.roleIds);
        }

        extra.replyOptions.allowedMentions!.parse = parse;
    },

    patchEditAllowedMentions(channelId: string, allowedMentions?: { parse: string[], users?: string[], roles?: string[], replied_user: boolean; }) {
        const mentions: {
            parse: string[],
            users?: string[],
            roles?: string[],
            repliedUser: boolean;
        } = {
            parse: [],
            repliedUser: false,
        };

        this.setAllowedMentions(channelId, {
            replyOptions: {
                messageReference: undefined,
                allowedMentions: mentions,
            }
        }, "edit");

        return {
            parse: mentions.parse,
            users: mentions.users,
            roles: mentions.roles,
            replied_user: allowedMentions?.replied_user ?? false
        };
    },

    removeEditMentionsMap(channelId: string) {
        editMentionsMap.delete(channelId);
    },

    shouldSkipContentWarningPopout(channelId: string) {
        const mentions = sendMentionsMap.get(channelId);
        return isNonNullish(mentions) && !mentions.everyone;
    },

    start() {
        this.preSend = addPreSendListener((channelId, _, extra) => this.setAllowedMentions(channelId, extra, "send"));
    },

    stop() {
        removePreSendListener(this.preSend);
    }
});
