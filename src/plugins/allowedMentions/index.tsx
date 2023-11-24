/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addPreSendListener, MessageExtra, removePreSendListener } from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import { Flex } from "@components/Flex";
import { Devs } from "@utils/constants";
import { isNonNullish } from "@utils/guards";
import definePlugin, { OptionType } from "@utils/types";
import { Alerts, GuildStore, PermissionsBits, PermissionStore } from "@webpack/common";
import { Channel } from "discord-types/general";

import { AllowedMentions, AllowedMentionsBar, AllowedMentionsProps, AllowedMentionsStore as store } from "./AllowedMentions";

export default definePlugin({
    name: "AllowedMentions",
    authors: [Devs.arHSM, Devs.amia],
    description: "Fine grained control over whom to ping when sending or editing a message.",
    dependencies: ["MessageEventsAPI"],
    settings: definePluginSettings({
        pingEveryone: {
            type: OptionType.BOOLEAN,
            description: "Mention everyone by default",
            default: false,
        },
        pingAllUsers: {
            type: OptionType.BOOLEAN,
            description: "Mention all users by default",
            default: true,
        },
        pingAllRoles: {
            type: OptionType.BOOLEAN,
            description: "Mention all roles by default",
            default: true,
        }
    }),
    patches: [
        {
            find: ".AnalyticEvents.APPLICATION_COMMAND_VALIDATION_FAILED,",
            replacement: [
                // Pass type prop to slate wrapper
                {
                    match: /className:\i\(\i,\i.slateContainer\),children:\(0,\i.jsx\)\(\i.\i,{/,
                    replace: "$& type: arguments[0].type,"
                }
            ]
        },
        {
            find: '"chat input type must be set");',
            replacement: [
                // Set allowedMentions & populate attachments store
                {
                    match: /"chat input type must be set"\);/,
                    replace: "$& $self.allowedSlateTypes.includes(arguments[0].type?.analyticsName) && $self.setAllowedMentions(arguments[0]);"
                },
                // Add the hasConnectedBar class when AllowedMentionsBar is visible
                {
                    match: /.hasConnectedBar]:\i/,
                    replace: '$& || $self.getAllowedMentions(arguments[0].channel.id, arguments[0].type?.analyticsName === "edit"),'
                },
                // Pass mentions to attached bars component
                // Would do a simple isEdit but the component is memo'd
                {
                    match: /activeCommand:\i,pendingReply:\i/,
                    replace: '$&, mentions: $self.getAllowedMentions(arguments[0].channel.id, arguments[0].type?.analyticsName === "edit"),'
                },
            ]
        },
        {
            find: ".stackedAttachedBar]:!",
            replacement: [
                // Add AllowedMentionsBar when not replying
                // Will never render if above patch fails
                {
                    match: /(?<=pendingReply:\i}=(\i),.+?)null!=(\i)&&(\i).push\(\(0,\i.jsx\)\(\i.\i,{reply:\i,/,
                    replace: "null == $2 && null != $1.mentions && $3.push($self.AllowedMentionsBar({ mentions: $1.mentions, channel: $1.channel })), $&"
                }
            ]
        },
        {
            find: ".Messages.REPLYING_TO.format({",
            replacement: [
                // Add AllowedMentionsBar to reply bar when replying
                {
                    match: /(?<="div",\{className:\i.actions,children:\[)(?=\i&&)/,
                    replace: "null != $self.getAllowedMentions(arguments[0].reply.channel.id, false) && $self.AllowedMentionsBarInner({ mentions: $self.getAllowedMentions(arguments[0].reply.channel.id, false), channel: arguments[0].reply.channel, trailingSeparator: true }),",
                }
            ]
        },
        {
            find: ".Messages.EVERYONE_POPOUT_BODY",
            replacement: [
                // Remove the warning popout for large server when @everyone mention is off
                {
                    match: /(?<=shouldShowEveryoneGuard\(\i,(\i)\))/,
                    replace: "|| $self.skipEveryoneContentWarningPopout($1.id)"
                }
            ]
        },
        {
            find: '"?use_nested_fields=true"',
            replacement: [
                // Patch sending allowed_mentions for forum creation
                {
                    match: /(?<=.Endpoints.CHANNEL_THREADS\((\i.id)\)\+"\?use_nested_fields=true".+?message:\{)/,
                    replace: "allowed_mentions: $self.patchForumAllowedMentions($1),"
                }
            ]
        },
        {
            find: ".ComponentActions.FOCUS_COMPOSER_TITLE,",
            replacement: [
                // Clear entry on cancelling new forum post
                {
                    match: /.trackForumNewPostCleared\)\(\{guildId:\i.guild_id,channelId:(\i.id)\}\)/,
                    replace: "$&; $self.onForumCancel($1);"
                },
                // Fail creating forum if tooManyUsers or tooManyRoles
                {
                    match: /applyChatRestrictions\)\(\{.+?channel:(\i)\}\);if\(!\i/,
                    replace: "$& || !$self.validateForum($1.id)"
                }
            ]
        }
    ],
    allowedSlateTypes: ["normal", "sidebar", "thread_creation", "create_forum_post"],
    getAllowedMentions(channelId: string, shouldDelete?: boolean) {
        const mentions = store.get(channelId);

        if (shouldDelete) { store.delete(channelId); }

        return mentions;
    },
    setAllowedMentions({ richValue, channel: { id: channelId, guild_id: guildId } }: { richValue: any, channel: Channel; }) {
        const previous = store.get(channelId);

        const canMentionEveryone = isNonNullish(guildId) ? PermissionStore.can(PermissionsBits.MENTION_EVERYONE, GuildStore.getGuild(guildId)) as boolean : true;

        const mentions: AllowedMentions = {
            parse: new Set(),
            users: previous?.users ?? new Set(),
            roles: previous?.roles ?? new Set(),
            meta: {
                hasEveryone: false,
                userIds: new Set(),
                roleIds: new Set(),
                tooManyUsers: false,
                tooManyRoles: false,
            }
        };

        if (!isNonNullish(richValue[0]?.children)) {
            return undefined;
        }

        // Discord renders the slate wrapper twice
        // 1. unparsed raw text
        // 2. parsed text (we need this)
        // We skip setting allowed mentions for unparsed text cause there can be potential unparsed mentions
        if (richValue[0]?.children.length === 1 && typeof richValue[0]?.children[0].text === "string") {
            // This is the case where the input is empty (no potential unparsed mentions)
            if (richValue[0]?.children[0].text === "") { store.delete(channelId); }

            return;
        }

        for (const node of richValue[0].children) {
            switch (node.type) {
                case "userMention":
                    mentions.meta.userIds.add(node.userId);
                    break;
                case "roleMention":
                    mentions.meta.roleIds.add(node.roleId);
                    break;
                case "textMention":
                    if (node.name === "@everyone" || node.name === "@here") {
                        mentions.meta.hasEveryone = canMentionEveryone;

                        if (canMentionEveryone && (previous?.parse.has?.("everyone") ?? this.settings.store.pingEveryone)) {
                            mentions.parse.add("everyone");
                        }
                    }
                    break;
            }
        }

        if (this.settings.store.pingAllUsers) { mentions.users = mentions.meta.userIds; }
        if (this.settings.store.pingAllRoles) { mentions.roles = mentions.meta.roleIds; }

        if (
            !mentions.meta.hasEveryone
            && mentions.meta.userIds.size === 0
            && mentions.meta.roleIds.size === 0
        ) {
            store.delete(channelId);
        } else {
            store.set(channelId, mentions, true);
        }
    },
    skipEveryoneContentWarningPopout(channelId: string) {
        const mentions = store.get(channelId);
        return isNonNullish(mentions) && !mentions.parse.has("everyone");
    },
    tooManyAlert(tooManyUsers: boolean, tooManyRoles: boolean) {
        const type = [
            tooManyUsers && "users",
            tooManyRoles && "roles"
        ].filter(x => x).join(" and ");

        Alerts.show({
            title: "Uh oh!",
            body: `You've selected too many individual ${type} to mention!\nYou may only select all or up to 100 items in each category.`
        });
    },
    validateForum(channelId: string) {
        const mentions = this.getAllowedMentions(channelId, true);
        if (!isNonNullish(mentions)) return;

        if (mentions.meta.tooManyUsers || mentions.meta.tooManyRoles) {
            this.tooManyAlert(mentions.meta.tooManyUsers, mentions.meta.tooManyRoles);
            return false;
        }

        return true;
    },
    patchSendAllowedMentions(channelId: string, extra: MessageExtra) {
        const mentions = this.getAllowedMentions(channelId, true);
        if (!isNonNullish(mentions)) return;

        if (mentions.meta.tooManyUsers || mentions.meta.tooManyRoles) {
            this.tooManyAlert(mentions.meta.tooManyUsers, mentions.meta.tooManyRoles);
            return { cancel: true };
        }

        extra.replyOptions.allowedMentions = {
            parse: Array.from(mentions.parse),
            users: mentions.users ? Array.from(mentions.users) : undefined,
            roles: mentions.roles ? Array.from(mentions.roles) : undefined,
            // Don't override this for send! Discord already has a UI for this
            repliedUser: extra.replyOptions.allowedMentions?.repliedUser ?? false,
        };
    },
    patchForumAllowedMentions(channelId: string) {
        const mentions = this.getAllowedMentions(channelId, true);
        if (!isNonNullish(mentions)) return;

        return {
            parse: Array.from(mentions.parse),
            users: mentions.users ? Array.from(mentions.users) : undefined,
            roles: mentions.roles ? Array.from(mentions.roles) : undefined,
        };
    },
    onForumCancel(channelId: string) {
        store.delete(channelId);
    },
    AllowedMentionsBar(props: AllowedMentionsProps) {
        return <Flex style={{ padding: "0.45rem 1rem", lineHeight: "16px" }}>
            {<this.AllowedMentionsBarInner {...props} />}
        </Flex>;
    },
    AllowedMentionsBarInner(props: AllowedMentionsProps) {
        return <AllowedMentionsBar {...props} />;
    },
    start() {
        this.preSend = addPreSendListener((channelId, _, extra) => this.patchSendAllowedMentions(channelId, extra));
    },
    stop() {
        removePreSendListener(this.preSend);
        store.clear();
    },
});
