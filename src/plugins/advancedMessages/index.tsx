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
import { GuildStore, MessageStore, PermissionsBits, PermissionStore } from "@webpack/common";
import { Channel, Message } from "discord-types/general";

import { AllowedMentionsBar, AllowedMentionsProps } from "./components/AllowedMentions";
import MediaName, { MediaNameProps } from "./components/MediaName";
import { AllowedMentions, EditAllowedMentionsStore, EditAttachmentsStore, SendAllowedMentionsStore } from "./stores";

export default definePlugin({
    name: "AdvancedMessages",
    description: "Power utilities for sending/editing messages",
    authors: [Devs.arHSM],
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
        },
        showMediaNames: {
            type: OptionType.BOOLEAN,
            description: "Show file names of images and videos",
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
                    replace: '$& $self.allowedSlateTypes.includes(arguments[0].type?.analyticsName) && $self.setAllowedMentions(arguments[0]); arguments[0].type?.analyticsName === "edit" && $self.createEditAttachmentEntry(arguments[0].channel.id);'
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
            find: ".Messages.NO_SEND_MESSAGES_PERMISSION_PLACEHOLDER",
            replacement: [
                // Add support for pasting attachments
                {
                    match: /this.handlePaste=(\i)=>\{/,
                    replace: '$& this.props.type.analyticsName === "edit" && $self.handlePaste(this.props.channel.id, $1);',
                }
            ]
        },
        {
            find: "async editMessage(",
            replacement: [
                // Add edit callbacks for allowed_mentions and attachments
                {
                    match: /(?<=async editMessage\((\i),.+?allowed_mentions:)\i/,
                    replace: "$self.patchEditAllowedMentions($1, $&), attachments: $self.patchEditAttachments($1)"
                }
            ]
        },
        {
            find: '"?use_nested_fields=true"',
            replacement: [
                // Patch sending allowed_mentions for forum creation
                {
                    match: /(?<=.Endpoints.CHANNEL_THREADS\((\i.id)\)\+"\?use_nested_fields=true".+?message:\{)/,
                    replace: "allowed_mentions: patchForumAllowedMentions($1),"
                }
            ]
        },
        {
            find: ".Messages.UPLOAD_TO.format({",
            replacement: [
                // Patch drag-to-upload to append to editing message instead of new message
                {
                    match: /channel:(\i).+?onDrop:(\i)=>\{/,
                    replace: "$& if ($self.onDragAttachmentEditMessage($1.id, $2)) { return; }"
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
            find: '..."IMAGE"===',
            replacement: [
                // Override renderImageComponent and renderVideoComponent functions
                {
                    match: /return\(0,\i.jsx\)\(\i.GIFAccessoryContext.Provider,\{.+?,children:\(0,\i.jsx\)\(\i.default,\{...(\i)(?=\}\))/,
                    replace: '$&, renderImageComponent: $self.AttachmentDecoration($1, "IMAGE"), renderVideoComponent: $self.AttachmentDecoration($1, "VIDEO")'
                }
            ]
        },
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

        const mentions: AllowedMentions = {
            parse: new Set(),
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
                roleIds: new Set()
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
                store.set(channelId, mentions);
            } else {
                store.delete(channelId);
            }

            return;
        }


        const canMentionEveryone = isNonNullish(guildId) ? PermissionStore.can(PermissionsBits.MENTION_EVERYONE, GuildStore.getGuild(guildId)) as boolean : true;

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

                        if (canMentionEveryone && (message?.mentionEveryone ?? previous?.parse.has?.("everyone") ?? this.settings.store.pingEveryone)) {
                            mentions.parse.add("everyone");
                        }
                    }
                    break;
            }
        }

        if (isNonNullish(message)) {
            // Provide default set of ids to be used in AllowedMentionsBar
            // filter these cause we don't want "ghost" ids (ids in original
            // text but not in the edited)
            const users = new Set(message.mentions.filter(userId => mentions.meta.userIds.has(userId)));
            const roles = new Set(message.mentionRoles.filter(roleId => mentions.meta.roleIds.has(roleId)));
            // Set these to false, we need complete verbosity over editing.
            // These must be true if mentioned count is more than 100 cause api
            // can only handle 100 explicit ids, beyond that you have to cope
            // with pinging all
            if (users.size > 100) { mentions.parse.add("users"); } else { mentions.users = users; }
            if (roles.size > 100) { mentions.parse.add("roles"); } else { mentions.roles = roles; }
        } else {
            if (previous?.parse.has("users") ?? this.settings.store.pingAllUsers) { mentions.parse.add("users"); }
            if (previous?.parse.has("roles") ?? this.settings.store.pingAllRoles) { mentions.parse.add("roles"); }
        }

        if (
            !mentions.meta.hasEveryone
            && !mentions.meta.isReply
            && mentions.meta.userIds.size === 0
            && mentions.meta.roleIds.size === 0
        ) {

            store.delete(channelId);
        } else {
            store.set(channelId, mentions);
        }
    },
    skipEveryoneContentWarningPopout(channelId: string) {
        const mentions = SendAllowedMentionsStore.get(channelId);
        return isNonNullish(mentions) && !mentions.parse.has("everyone");
    },
    patchSendAllowedMentions(channelId: string, extra: MessageExtra) {
        const mentions = this.getAllowedMentions(channelId, false, true);
        if (!isNonNullish(mentions)) return;

        extra.replyOptions.allowedMentions = {
            parse: Array.from(mentions.parse),
            users: mentions.users ? Array.from(mentions.users) : undefined,
            roles: mentions.roles ? Array.from(mentions.roles) : undefined,
            // Don't override this for send! Discord already has a UI for this
            repliedUser: extra.replyOptions.allowedMentions?.repliedUser ?? false,
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
    patchEditAllowedMentions(channelId: string, original: any) {
        const mentions = this.getAllowedMentions(channelId, true, true);
        if (!isNonNullish(mentions)) return original;

        return {
            parse: Array.from(mentions.parse),
            users: mentions.users ? Array.from(mentions.users) : undefined,
            roles: mentions.roles ? Array.from(mentions.roles) : undefined,
            replied_user: mentions.repliedUser,
        };
    },
    createEditAttachmentEntry(channelId: string) {
        // An entry could have been created in a previous render
        if (EditAttachmentsStore.has(channelId)) return;

        EditAttachmentsStore.set(channelId, { attachments: [] });
    },
    handlePaste(channelId: string, event: ClipboardEvent) {
        // In the evnt where the patch to create an entry fails return instead
        // of crashing
        if (!EditAttachmentsStore.has(channelId)) return;
        if (!isNonNullish(event.clipboardData)) return;

        for (const item of event.clipboardData.items) {
            if (item.kind !== "file") continue;

            // Cannot be null, guaranteed by above .kind equality check
            const file = item.getAsFile()!;

            // Cannot be undefined, guaranteed by above .has check
            EditAttachmentsStore.get(channelId)!.attachments.push(file);
        }
    },
    onDragAttachmentEditMessage(channelId: string, file: File) {
        // Returns either false or true
        // false = discord proceeds to handle onDrag and uploads it for a
        //         new draft message
        // true  = we had a pending edit and attachment is to be handled by
        //         our logic hence aborting discord's handler

        const entry = EditAttachmentsStore.get(channelId);

        if (!isNonNullish(entry)) {
            return false;
        }

        entry.attachments.push(file);

        return true;
    },
    patchEditAttachments(channelId: string) {
        const attachments = EditAttachmentsStore.get(channelId);
        EditAttachmentsStore.delete(channelId);

        if (!isNonNullish(attachments) || attachments.attachments.length === 0) return;

        // TODO:
        // - Create an attachment queue component
        // - Update queue based on existing attachments and on paste/drag-n-drop
        // - Allow rearranging the attachment queue and removing attachments
        // - Upload new attachments
        // - Patch edit function to have an `attachments` property
    },
    shouldSubmitEdit(contentChanged: boolean, channelId: string) {
        if (!contentChanged) {
            // API strictly reqires content to change to change allowed mentions
            EditAllowedMentionsStore.delete(channelId);
        }

        // This should never be undefined unless a patch fails
        // Since we insert an empty entry regardless, we need to check the length
        // instead of a simple .has call
        const attachmentsLength = EditAttachmentsStore.get(channelId)?.attachments?.length;
        const hasAttachments = isNonNullish(attachmentsLength) && attachmentsLength > 0;

        // Submit edit if content changed or AttachmentStore has an entry
        return contentChanged || hasAttachments;
    },
    onEditCancel(channelId: string) {
        EditAllowedMentionsStore.delete(channelId);
        EditAttachmentsStore.delete(channelId);
    },
    AllowedMentionsBar(props: AllowedMentionsProps) {
        return <Flex style={{ padding: "0.45rem 1rem", lineHeight: "16px" }}>
            {<this.AllowedMentionsBarInner {...props} />}
        </Flex>;
    },
    AllowedMentionsBarInner(props: AllowedMentionsProps) {
        return <AllowedMentionsBar {...props} />;
    },
    AttachmentDecoration(props: MediaNameProps, kind: "IMAGE" | "VIDEO") {
        return (renderProps: any) => {
            return <>
                {kind === "IMAGE" ? props.renderImageComponent(renderProps) : props.renderVideoComponent(renderProps)}
                {this.settings.store.showMediaNames && <MediaName {...props} />}
            </>;
        };
    },
    start() {
        this.preSend = addPreSendListener((channelId, _, extra) => this.patchSendAllowedMentions(channelId, extra));
    },
    stop() {
        removePreSendListener(this.preSend);
        SendAllowedMentionsStore.clear();
        EditAllowedMentionsStore.clear();
        EditAttachmentsStore.clear();
    },
    // HACK: remove
    debug() {
        return {
            SendAllowedMentionsStore,
            EditAllowedMentionsStore,
            EditAttachmentsStore,
        };
    },
});
