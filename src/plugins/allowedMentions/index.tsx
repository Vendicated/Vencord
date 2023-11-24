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
import { Alerts, GuildStore, MessageStore, PermissionsBits, PermissionStore, Toasts } from "@webpack/common";
import { Channel, Message } from "discord-types/general";

import { AllowedMentions, AllowedMentionsBar, AllowedMentionsProps, EditAllowedMentionsStore, SendAllowedMentionsStore } from "./AllowedMentions";

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
            find: ".default.getEditingTextValue(",
            replacement: [
                // Pass message to slate wrapper when editing a message
                {
                    match: /channel:\i,type:\i.ChatInputTypes.EDIT,/,
                    replace: "$& message: arguments[0].message,"
                }
            ]
        },
        {
            find: ".AnalyticEvents.APPLICATION_COMMAND_VALIDATION_FAILED,",
            replacement: [
                // Pass type prop to slate wrapper
                {
                    match: /className:\i\(\i,\i.slateContainer\),children:\(0,\i.jsx\)\(\i.default,{/,
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
                    match: /(?<=pendingReply:\i}=(\i),.+?)null!=(\i)&&(\i).push\(\(0,\i.jsx\)\(\i.default,{reply:\i,/,
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
            find: "async editMessage(",
            replacement: [
                // Add edit callbacks for allowed_mentions
                {
                    match: /(?<=async editMessage\((\i),.+?allowed_mentions:)\i/,
                    replace: "$self.patchEditAllowedMentions($1, $&)"
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
            find: ".Messages.EDIT_TEXTAREA_HELP.format({",
            replacement: [
                // Add onEditCancel callback for cancelling edit by cancel button
                {
                    match: /(?<=\.Messages\.EDIT_TEXTAREA_HELP\.format\(\{onCancel:\(\)=>)(\i)\((\i.id)\)/,
                    replace: "{ $self.onEditCancel($2); return $1($2) }"
                },
                // Patch onSubmit to submit if attachments have changed
                {
                    match: /return (\i.content!==this.props.message.content)&&/,
                    replace: "return $self.shouldSubmitEdit($1, this.props.channel.id) &&"
                },
                // Add onEditCancel callback for canelling edit by ESC key
                {
                    match: /this.onKeyDown=\i=>\{if\(\i.keyCode===\i.KeyboardKeys.ESCAPE&&!\i.shiftKey\)\{/,
                    replace: "$& $self.onEditCancel(this.props.channel.id);"
                }
            ]
        },
        {
            find: ".AnalyticEvents.MESSAGE_POPOUT_MENU_OPENED_DESKTOP",
            replacement: [
                // You can start editing message in the midst of editing another
                // message, this cancels the previous message but there's no clear
                // way to handle that, so patching the edit button on messages
                // ensures that before editing any message the previous state is cleared
                {
                    match: /(?<=\i\(\{key:"edit",channel:(\i),.+?,onClick:)\i.editMessage/,
                    replace: "(...args) => { $self.onEditCancel($1.id); return $&(...args) }"
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
    allowedSlateTypes: ["normal", "edit", "sidebar", "thread_creation", "create_forum_post"],
    getAllowedMentionsStore(isEdit: boolean) {
        return isEdit ? EditAllowedMentionsStore : SendAllowedMentionsStore;
    },
    getAllowedMentions(channelId: string, isEdit: boolean, shouldDelete?: boolean) {
        const store = this.getAllowedMentionsStore(isEdit);
        const mentions = store.get(channelId);

        if (shouldDelete) { store.delete(channelId); }

        return mentions;
    },
    setAllowedMentions({
        richValue,
        channel: { id: channelId, guild_id: guildId },
        message
    }: {
        richValue: any,
        channel: Channel,
        message: Message | undefined;
    }) {
        const store = this.getAllowedMentionsStore(isNonNullish(message));
        const previous = store.get(channelId);

        const canMentionEveryone = isNonNullish(guildId) ? PermissionStore.can(PermissionsBits.MENTION_EVERYONE, GuildStore.getGuild(guildId)) as boolean : true;

        const mentions: AllowedMentions = {
            parse: new Set(canMentionEveryone && message?.mentionEveryone ? ["everyone"] : []),
            users: previous?.users ?? new Set(),
            roles: previous?.roles ?? new Set(),
            repliedUser: isNonNullish(message) && isNonNullish(message.messageReference)
                ? message.mentions.includes(
                    MessageStore.getMessage(
                        message.messageReference.channel_id,
                        message.messageReference.message_id
                    )?.author?.id
                )
                : previous?.repliedUser ?? false,
            meta: {
                hasEveryone: false,
                isEdit: isNonNullish(message),
                isReply: message?.type === 19,
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
            if (richValue[0]?.children[0].text === "") {
                store.delete(channelId);
            }

            // Replying is a special case where we don't need extra ast nodes
            if (mentions.meta.isReply) {
                store.set(channelId, mentions, true);
            } else {
                store.delete(channelId);
            }

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

        // Provide default set of ids to be used in AllowedMentionsBar
        if (isNonNullish(message)) {
            // Filter these cause we don't want "ghost" ids (ids in original
            // text but not in the edited)
            mentions.users = new Set(message.mentions.filter(userId => mentions.meta.userIds.has(userId)));
            mentions.roles = new Set(message.mentionRoles.filter(roleId => mentions.meta.roleIds.has(roleId)));
        } else {
            if (this.settings.store.pingAllUsers) { mentions.users = mentions.meta.userIds; }
            if (this.settings.store.pingAllRoles) { mentions.roles = mentions.meta.roleIds; }
        }

        if (
            !mentions.meta.hasEveryone
            && !mentions.meta.isReply
            && mentions.meta.userIds.size === 0
            && mentions.meta.roleIds.size === 0
        ) {

            store.delete(channelId);
        } else {
            store.set(channelId, mentions, true);
        }
    },
    skipEveryoneContentWarningPopout(channelId: string) {
        const mentions = SendAllowedMentionsStore.get(channelId);
        return isNonNullish(mentions) && !mentions.parse.has("everyone");
    },
    validateForum(channelId: string) {
        const mentions = this.getAllowedMentions(channelId, false, true);
        if (!isNonNullish(mentions)) return;

        if (mentions.meta.tooManyUsers || mentions.meta.tooManyRoles) {
            const type = [
                mentions.meta.tooManyUsers && "users",
                mentions.meta.tooManyRoles && "roles"
            ].filter(x => x).join(" and ");

            Alerts.show({
                title: "Uh oh!",
                body: `You've selected too many individual ${type} to mention!\nYou may only select all or up to 100 items in each category.`
            });

            return false;
        }

        return true;
    },
    patchSendAllowedMentions(channelId: string, extra: MessageExtra) {
        const mentions = this.getAllowedMentions(channelId, false, true);
        if (!isNonNullish(mentions)) return;

        if (mentions.meta.tooManyUsers || mentions.meta.tooManyRoles) {
            const type = [
                mentions.meta.tooManyUsers && "users",
                mentions.meta.tooManyRoles && "roles"
            ].filter(x => x).join(" and ");

            Alerts.show({
                title: "Uh oh!",
                body: `You've selected too many individual ${type} to mention!\nYou may only select all or up to 100 items in each category.`
            });

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
    patchEditAllowedMentions(channelId: string, original: any) {
        const mentions = this.getAllowedMentions(channelId, true, true);
        if (!isNonNullish(mentions)) return original;

        if (mentions.meta.tooManyUsers || mentions.meta.tooManyRoles) {
            const type = [
                mentions.meta.tooManyUsers && "users",
                mentions.meta.tooManyRoles && "roles"
            ].filter(x => x).join(" and ");

            Toasts.show({
                id: Toasts.genId(),
                message: `You've selected too many individual ${type} to mention! All will be mentioned.`,
                type: Toasts.Type.FAILURE,
            });
        }

        return {
            parse: Array.from(mentions.parse),
            users: mentions.users ? Array.from(mentions.users) : undefined,
            roles: mentions.roles ? Array.from(mentions.roles) : undefined,
            replied_user: mentions.repliedUser,
        };
    },
    patchForumAllowedMentions(channelId: string) {
        const mentions = this.getAllowedMentions(channelId, false, true);
        if (!isNonNullish(mentions)) return;

        return {
            parse: Array.from(mentions.parse),
            users: mentions.users ? Array.from(mentions.users) : undefined,
            roles: mentions.roles ? Array.from(mentions.roles) : undefined,
        };
    },
    shouldSubmitEdit(contentChanged: boolean, channelId: string) {
        if (!contentChanged) {
            // API strictly reqires content to change to change allowed mentions
            EditAllowedMentionsStore.delete(channelId);
        }

        return contentChanged;
    },
    onEditCancel(channelId: string) {
        EditAllowedMentionsStore.delete(channelId);
    },
    onForumCancel(channelId: string) {
        SendAllowedMentionsStore.delete(channelId);
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
        SendAllowedMentionsStore.clear();
        EditAllowedMentionsStore.clear();
    },
});
