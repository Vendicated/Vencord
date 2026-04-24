/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { definePluginSettings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import { getGuildAcronym, insertTextIntoChatInputBox } from "@utils/discord";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import type { Channel } from "@vencord/discord-types";
import { ChannelType } from "@vencord/discord-types/enums";
import { ChannelStore, GuildStore, IconUtils, RelationshipStore, SelectedChannelStore, showToast, Toasts, UserStore } from "@webpack/common";

import { beginDrag as beginSessionDrag, clearDragState, getLastDropAt, hasActiveDrag, isGuildDragActive, isInputDragSource, isUserDragActive, markDrop, markInputDragSource, scheduleGuildCleanup, shouldIgnoreDrop, startDragWatchdog, stopDragState, touchDrag } from "./dragState";
import { type GhostState, hideGhost as hideDragGhost, isGhostVisible, mountGhost as mountDragGhost, scheduleGhostPosition as scheduleDragGhostPosition, showGhost as showDragGhost, unmountGhost as unmountDragGhost } from "./ghost";
import { clearInviteCache, createInvite, isGroupMessageChannel } from "./invite";
import { type ChannelTarget, inspectDragEvent, type ResolvedDragTarget } from "./targets";
import { collectPayloadStrings, type DropEntity, extractStrings, parseDragifyPayload, parseFromStrings, serializeDragEntity } from "./utils";

const logger = new Logger("Dragify");

type DragifyRuntime = {
    onDrop(event: DragEvent, channel?: Channel | null): Promise<void>;
    isMessageInputEvent(event: DragEvent): boolean;
    onUserDragStart(event: DragEvent, user?: { id: string; userId?: string; user?: { id: string; }; }): void;
    onChannelDragStart(event: DragEvent, channel?: ChannelTarget): void;
    onDmDragStart(event: DragEvent, channel?: Channel | null): void;
    onGuildDragStart(event: DragEvent, guildId: string): void;
    beginDrag(event: DragEvent, entity: DropEntity, options?: { effectAllowed?: DataTransfer["effectAllowed"]; }): void;
    showGhost(entity: DropEntity, event?: DragEvent): void;
    getDmRecipientId(channel?: Channel | null): string | null;
};

let pluginInstance: DragifyRuntime | null = null;
let transparentDragImage: HTMLCanvasElement | null = null;

function getTransparentDragImage(): HTMLCanvasElement | null {
    if (typeof document === "undefined") return null;
    if (transparentDragImage) return transparentDragImage;
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    transparentDragImage = canvas;
    return canvas;
}

function suppressDefaultDragPreview(event: DragEvent) {
    const image = getTransparentDragImage();
    if (!image || !event.dataTransfer?.setDragImage) return;
    event.dataTransfer.setDragImage(image, 0, 0);
}

function setDragifyDataTransfer(dataTransfer: DataTransfer | null, entity: DropEntity) {
    if (!dataTransfer) return;

    if (dataTransfer.clearData) {
        dataTransfer.clearData("text/plain");
        dataTransfer.clearData("text/uri-list");
        dataTransfer.clearData("text/html");
    }

    const payload = serializeDragEntity(entity);
    dataTransfer.setData("application/json", payload);
    dataTransfer.setData("application/dragify", payload);
    dataTransfer.setData("text/plain", "");
}

function hasDragifyTransfer(dataTransfer?: DataTransfer | null) {
    return dataTransfer?.types?.includes("application/dragify");
}

function buildDropKey(entity: DropEntity, channelId: string) {
    return `${entity.kind}:${entity.id}:${channelId}`;
}

function inspectDragTarget(event: DragEvent, runtime: Pick<DragifyRuntime, "getDmRecipientId">): ResolvedDragTarget {
    return inspectDragEvent(event, {
        ChannelStore,
        UserStore,
        getDmRecipientId: runtime.getDmRecipientId,
    });
}

const settings = definePluginSettings({
    userOutput: {
        type: OptionType.SELECT,
        description: "User drop output.",
        options: [
            { label: "Mention user", value: "mention", default: true },
            { label: "User ID", value: "id" },
        ],
    },
    channelOutput: {
        type: OptionType.SELECT,
        description: "Channel drop output.",
        options: [
            { label: "#channel mention", value: "mention", default: true },
            { label: "Channel link", value: "link" },
        ],
    },
    inviteExpireAfter: {
        type: OptionType.SELECT,
        description: "Invite expiration.",
        options: [
            { label: "30 minutes", value: 1800 },
            { label: "1 hour", value: 3600 },
            { label: "6 hours", value: 21600 },
            { label: "12 hours", value: 43200 },
            { label: "1 day", value: 86400 },
            { label: "7 days", value: 604800 },
            { label: "Never", value: 0, default: true },
        ],
    },
    inviteMaxUses: {
        type: OptionType.SELECT,
        description: "Invite max uses.",
        options: [
            { label: "No limit", value: 0, default: true },
            { label: "1 use", value: 1 },
            { label: "5 uses", value: 5 },
            { label: "10 uses", value: 10 },
            { label: "25 uses", value: 25 },
            { label: "50 uses", value: 50 },
            { label: "100 uses", value: 100 },
        ],
    },
    inviteTemporaryMembership: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Grant temporary membership.",
    },
    reuseExistingInvites: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Reuse existing invite instead of creating a new one.",
    },
    allowChatBodyDrop: {
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: true,
        description: "Allow dropping into the main chat body to insert text.",
    },
});

export default definePlugin({
    name: "Dragify",
    description: "Drop users, channels, or servers into chat to insert mentions or invites.",
    tags: ["Chat", "Servers", "Utility", "Voice"],
    authors: [EquicordDevs.justjxke],
    settings,

    patches: [
        // Voice user rows (voice channel sidebar list)
        {
            find: ".VOICE_USER],shouldShow:",
            replacement: {
                match: /(?<=GuildChannelUserContextMenu.{0,150})"data-dnd-name":\i/,
                replace: "\"data-dragify-user\":!0,\"data-user-id\":arguments[0].user?.id,draggable:!0,onDragStart:e=>$self.onUserDragStart(e,arguments[0].user),$&"
            }
        },
        {
            find: "tutorialId:\"voice-conversations\"",
            replacement: [
                // Voice channel rows (guild sidebar)
                {
                    match: /(?<=this.getTooltipText\(\),.{0,100})iconClassName:/,
                    replace: "draggable:!0,onDragStart:e=>$self.onChannelDragStart(e,{id:this?.props?.channel?.id,guild_id:this?.props?.channel?.guild_id}),$&"
                },
                // Voice channel rows (guild sidebar fallback - li wrapper)
                {
                    match: /(?<=this\.getModeClass\(\),.{0,50})"data-dnd-name":.{0,40},children:\[/g,
                    replace: "draggable:!0,onDragStart:e=>$self.onChannelDragStart(e,{id:this?.props?.channel?.id,guild_id:this?.props?.channel?.guild_id}),$&"
                }
            ]
        },
        // Thread rows in channel list (sidebar thread items)
        {
            find: "__invalid_threadMainContent",
            replacement: {
                match: /className:\i\.\i,onClick:\i,"aria-label":(?=.{0,100}__invalid_threadMainContent)/,
                replace: "draggable:!0,onDragStart:e=>$self.onChannelDragStart(e),$&"
            }
        },
        // Thread rows in channel list (threaded child rows)
        // (handled by __invalid_threadMainContent patch)
        // Channel list items (modern list wrapper)
        {
            find: "shouldShowThreadsPopout",
            replacement: {
                match: /(?<=getClassName\(\).{0,50})"data-dnd-name":.{0,40},onMouseEnter:/,
                replace: "draggable:!0,onDragStart:e=>$self.onChannelDragStart(e,{id:this?.props?.channel?.id,guild_id:this?.props?.channel?.guild_id}),$&"
            }
        },
        // Thread rows (active threads popout)
        {
            find: "POPOUT)},children:",
            replacement: {
                match: /(?<=getUser\(\i\.ownerId\).{0,100})className:\i\.\i,onClick:\i=>\{\(0,\i\.\i\)\((\i),/,
                replace: "draggable:!0,onDragStart:e=>$self.onChannelDragStart(e,{id:arguments[0]?.thread?.id,guild_id:arguments[0]?.thread?.guild_id}),$&"
            }
        },
        // Member list items (server member list)
        {
            find: ".MEMBER_USER})]",
            replacement: {
                match: /(?<=useRawTargetDimensions.{0,250})onContextMenu:\i,(?=onMouseEnter:)/,
                replace: "$&draggable:!0,onDragStart:e=>$self.onUserDragStart(e,{id:arguments[0].user?.id}),\"data-dragify-user\":!0,\"data-user-id\":arguments[0].user?.id,"
            }
        },
        // Chat usernames
        {
            find: ']="BADGES"',
            replacement: {
                match: /(?="data-username-has-gradient")/,
                replace: "draggable:!0,onDragStart:e=>$self.onUserDragStart(e,arguments[0].author),\"data-dragify-user\":!0,\"data-user-id\":arguments[0].author.id,"
            }
        },
        // Call avatars (DM/group call tiles)
        {
            find: ".VOICE_CHANNEL_TILE,children:",
            replacement: {
                match: /(?<=\.VOICE_USER,.{0,250})className:\i\.\i,onDoubleClick:\i,/,
                replace: "draggable:!0,onDragStart:e=>$self.onUserDragStart(e,{id:arguments[0].participantUserId}),\"data-dragify-user\":!0,\"data-user-id\":arguments[0].participantUserId,$&"
            }
        },
        // DM list entries (private channel rows)
        {
            find: "PrivateChannel.renderAvatar: Invalid prop configuration - no user or channel",
            replacement: {
                match: /\.CHANNEL\(\i\.\i,\i\.\i\),(?=.{0,150}\.isMultiUserDM\(\))/,
                replace: "$&draggable:!0,onDragStart:e=>$self.onDmDragStart(e,arguments[0].channel),"
            }
        },
        {
            find: "[aria-owns=folder-items-",
            replacement: {
                match: /"data-dnd-name":(\i)\.name,(?="data-drop-hovering".{0,300}"aria-selected":\i\}\)\}\))/,
                replace: "$&draggable:!0,onDragStart:e=>$self.onGuildDragStart(e,$1.id),"
            }
        },
    ],

    async onDrop(event: DragEvent, channel?: Channel | null) {
        if (isInputDragSource()) return;
        const { dataTransfer } = event;
        if (!dataTransfer || dataTransfer.files?.length) return;

        const resolvedChannel = channel
            ?? (SelectedChannelStore?.getChannelId?.()
                ? ChannelStore.getChannel(SelectedChannelStore.getChannelId())
                : null);
        if (!resolvedChannel) return;

        if (hasDragifyTransfer(dataTransfer)) {
            const entity = parseDragifyPayload(dataTransfer.getData("application/dragify"));
            if (!entity) {
                clearDragState();
                return;
            }
            if (shouldIgnoreDrop(buildDropKey(entity, resolvedChannel.id))) return;
            await this.handleDropEntity(entity, resolvedChannel);
            return;
        }

        const payloads = await collectPayloadStrings(dataTransfer);
        const entity = parseFromStrings(payloads, { ChannelStore, GuildStore, UserStore });
        if (!entity) {
            if (hasActiveDrag()) clearDragState();
            return;
        }
        if (shouldIgnoreDrop(buildDropKey(entity, resolvedChannel.id))) return;
        await this.handleDropEntity(entity, resolvedChannel);
    },

    async handleDropEntity(entity: DropEntity, channel: Channel) {
        try {
            const text = await this.buildText(entity, channel);
            if (!text) {
                clearDragState();
                return;
            }

            const inserted = entity.kind === "user"
                ? this.insertText(channel.id, text, { removeUnknownUser: true })
                : this.insertText(channel.id, text);

            if (!inserted) throw new Error("Unable to insert drag content");
            clearDragState();
        } catch (error) {
            clearDragState();
            logger.error("Failed handling drop", error);
            showToast("Dragify failed to handle drop.", Toasts.Type.FAILURE);
        }
    },

    async buildText(entity: DropEntity, currentChannel: Channel): Promise<string | null> {
        switch (entity.kind) {
            case "user":
                return settings.store.userOutput === "id" ? entity.id : `<@${entity.id}>`;
            case "channel":
                return this.formatChannel(entity.id, entity.guildId);
            case "guild":
                return await createInvite(entity.id, currentChannel, settings.store);
            default:
                return null;
        }
    },

    formatChannel(channelId: string, guildId?: string): string | null {
        const channel = ChannelStore.getChannel(channelId);
        if (!channel) return null;
        if (isGroupMessageChannel(channel)) {
            return `https://discord.com/channels/@me/${channelId}`;
        }
        if (settings.store.channelOutput === "link") {
            const effectiveGuildId = guildId ?? channel.guild_id ?? "@me";
            return `https://discord.com/channels/${effectiveGuildId}/${channelId}`;
        }
        return `<#${channelId}>`;
    },

    insertText(channelId: string, text: string, options?: { removeUnknownUser?: boolean; }): boolean {
        try {
            const nextText = options?.removeUnknownUser
                ? text.replace(/@unknown[- ]user/gi, "").trim()
                : text;
            if (!nextText) return false;
            insertTextIntoChatInputBox(nextText);
            return true;
        } catch (error) {
            logger.error("Failed to insert text into input", error);
            return false;
        }
    },

    beginDrag(event: DragEvent, entity: DropEntity, options?: { effectAllowed?: DataTransfer["effectAllowed"]; }) {
        if (!event.dataTransfer) return;
        suppressDefaultDragPreview(event);
        if (options?.effectAllowed) event.dataTransfer.effectAllowed = options.effectAllowed;
        beginSessionDrag(entity);
        this.showGhost(entity, event);
        setDragifyDataTransfer(event.dataTransfer, entity);
        if (entity.kind === "user") event.dataTransfer.setData("data-user-id", entity.id);
    },

    onChannelDragStart(event: DragEvent, channel?: ChannelTarget) {
        if (isUserDragActive()) return;

        const existing = parseDragifyPayload(event.dataTransfer?.getData("application/dragify") ?? "");
        if (existing?.kind === "user") return;

        const inspection = inspectDragTarget(event, this);
        if (inspection.hasDragifyUser) return;

        const resolved = channel ?? inspection.channel;
        if (!resolved?.id) return;

        const resolvedChannel = ChannelStore.getChannel(resolved.id);
        if (!resolvedChannel) return;

        if (resolvedChannel.isDM() && !isGroupMessageChannel(resolvedChannel)) {
            const recipientId = this.getDmRecipientId(resolvedChannel);
            if (recipientId) {
                this.onUserDragStart(event, { id: recipientId });
            }
            return;
        }

        this.beginDrag(event, {
            kind: "channel",
            id: resolvedChannel.id,
            guildId: resolved.guildId ?? resolvedChannel.guild_id ?? undefined,
        });
    },

    onUserDragStart(event: DragEvent, user?: { id: string; userId?: string; user?: { id: string; }; }) {
        const inspection = inspectDragTarget(event, this);
        if (inspection.hasAttachment) return;

        const rawUserId =
            inspection.authorId
            ?? user?.id
            ?? user?.userId
            ?? user?.user?.id
            ?? inspection.userId
            ?? null;
        const userId = rawUserId?.trim();
        if (!userId) return;

        this.beginDrag(event, { kind: "user", id: userId });
    },

    onDmDragStart(event: DragEvent, channel?: Channel | null) {
        const inspection = inspectDragTarget(event, this);
        const resolvedChannel = channel ?? (inspection.channel?.id ? ChannelStore.getChannel(inspection.channel.id) ?? null : null);
        if (!resolvedChannel) return;

        if (isGroupMessageChannel(resolvedChannel)) {
            this.onChannelDragStart(event, {
                id: resolvedChannel.id,
                guildId: resolvedChannel.guild_id ?? undefined,
            });
            return;
        }

        const recipientId = this.getDmRecipientId(resolvedChannel);
        if (!recipientId) return;
        this.onUserDragStart(event, { id: recipientId });
    },

    onGuildDragStart(event: DragEvent, guildId: string) {
        this.beginDrag(event, { kind: "guild", id: guildId }, { effectAllowed: "copyMove" });
    },

    start() {
        pluginInstance = this;
        this.mountGhost();
        window.addEventListener("dragover", this.globalDragOver, true);
        window.addEventListener("drop", this.globalDrop, true);
        window.addEventListener("dragstart", this.globalDragStart, true);
        window.addEventListener("drag", this.globalDragMove, true);
        window.addEventListener("dragover", this.globalDragMove, true);
        window.addEventListener("dragend", this.globalDragEnd, true);
        startDragWatchdog(hideDragGhost);
    },

    stop() {
        window.removeEventListener("dragover", this.globalDragOver, true);
        window.removeEventListener("drop", this.globalDrop, true);
        window.removeEventListener("dragstart", this.globalDragStart, true);
        window.removeEventListener("drag", this.globalDragMove, true);
        window.removeEventListener("dragover", this.globalDragMove, true);
        window.removeEventListener("dragend", this.globalDragEnd, true);
        stopDragState();
        clearInviteCache();
        this.unmountGhost();
        pluginInstance = null;
    },

    globalDragOver: (event: DragEvent) => {
        const inst = pluginInstance;
        if (!inst || !inst.isMessageInputEvent(event)) return;
        if (isInputDragSource()) return;
        const { dataTransfer } = event;
        if (!dataTransfer || dataTransfer.files?.length) return;
        if (!hasActiveDrag() && !hasDragifyTransfer(dataTransfer)) {
            const payloads = extractStrings(dataTransfer);
            if (!parseFromStrings(payloads, { ChannelStore, GuildStore, UserStore })) return;
        }

        event.preventDefault();
        event.stopPropagation();
        dataTransfer.dropEffect = "copy";
    },

    globalDrop: async (event: DragEvent) => {
        const inst = pluginInstance;
        if (!inst || !inst.isMessageInputEvent(event)) return;
        if (isInputDragSource()) return;
        const { dataTransfer } = event;
        if (!dataTransfer) return;

        if (dataTransfer.files?.length) {
            clearDragState();
            hideDragGhost();
            return;
        }

        const hasDragifyPayload = hasDragifyTransfer(dataTransfer);
        const hasActiveSessionDrag = hasActiveDrag();
        if (!hasDragifyPayload && !hasActiveSessionDrag) {
            const payloads = await collectPayloadStrings(dataTransfer);
            if (!parseFromStrings(payloads, { ChannelStore, GuildStore, UserStore })) return;
        }

        const channelId = SelectedChannelStore.getChannelId();
        const channel = ChannelStore.getChannel(channelId);
        if (!channel) {
            clearDragState();
            hideDragGhost();
            return;
        }

        markDrop();
        event.preventDefault();
        event.stopPropagation();
        await inst.onDrop(event, channel);
        hideDragGhost();
    },

    globalDragStart: (event: DragEvent) => {
        const inst = pluginInstance;
        if (!inst || !event.dataTransfer) return;

        const inspection = inspectDragTarget(event, inst);
        if (inspection.hasAttachment) return;
        if (inspection.hasMessageInput) {
            markInputDragSource();
            return;
        }
        if (hasDragifyTransfer(event.dataTransfer)) return;

        const markedUserId = inspection.authorId ?? inspection.userId;
        if (inspection.hasDragifyUser && markedUserId) {
            inst.onUserDragStart(event, { id: markedUserId });
            return;
        }

        if (inspection.hasTextNode && inspection.authorId) {
            inst.onUserDragStart(event, { id: inspection.authorId });
            return;
        }

        if (inspection.authorId && inspection.avatarUserId) {
            inst.onUserDragStart(event, { id: inspection.authorId });
            return;
        }

        if (inspection.channel && !inspection.hasUserMarker) {
            const channel = ChannelStore.getChannel(inspection.channel.id);
            if (channel && (channel.isDM() || isGroupMessageChannel(channel))) {
                inst.onDmDragStart(event, channel);
                return;
            }

            inst.onChannelDragStart(event, inspection.channel);
            return;
        }

        if (inspection.guildId) {
            inst.onGuildDragStart(event, inspection.guildId);
        }
    },

    globalDragEnd: (_event: DragEvent) => {
        setTimeout(() => {
            if (Date.now() - getLastDropAt() < 100) return;
            clearDragState();
            hideDragGhost();
        }, 0);
    },

    globalDragMove: (event: DragEvent | MouseEvent) => {
        if (!isGhostVisible()) return;
        if (event.clientX == null || event.clientY == null) return;

        if (event instanceof DragEvent) {
            touchDrag();
            if (isGuildDragActive()) scheduleGuildCleanup(hideDragGhost);
        }

        scheduleDragGhostPosition(event.clientX + 16, event.clientY + 20);
    },

    isMessageInputEvent(event: DragEvent): boolean {
        const inspection = inspectDragTarget(event, this);
        return inspection.hasMessageInput || (settings.store.allowChatBodyDrop && inspection.hasChatBody);
    },

    mountGhost() {
        mountDragGhost();
    },

    unmountGhost() {
        unmountDragGhost();
    },

    showGhost(entity: DropEntity, event?: DragEvent) {
        const ghost = this.buildGhost(entity);
        if (!ghost) return;

        const position = event?.clientX != null && event.clientY != null
            ? { x: event.clientX + 16, y: event.clientY + 20 }
            : undefined;
        showDragGhost({ ...ghost, entityId: entity.id }, position);
    },

    buildGhost(entity: DropEntity): Omit<GhostState, "visible" | "x" | "y"> | null {
        if (entity.kind === "user") {
            const user = UserStore.getUser(entity.id);
            if (!user) return null;

            const title = user.globalName ?? user.username;
            const subtitle = user.username ? `@${user.username}` : "User";
            const iconUrl = user.getAvatarURL(void 0, 80, true) ?? undefined;
            return { kind: "user", title, subtitle, iconUrl, symbol: "@", badge: "user", entityId: entity.id, exiting: false };
        }

        if (entity.kind === "channel") {
            const channel = ChannelStore.getChannel(entity.id);
            if (!channel) return null;

            const isThread = channel.isThread();
            const isGroupDm = channel.type === ChannelType.GROUP_DM;
            const channelName = this.getGroupDmDisplayName(channel) || channel.name;
            const title = `${isThread || isGroupDm ? "" : "#"}${channelName}`;
            const guild = channel.guild_id ? GuildStore.getGuild(channel.guild_id) : null;
            const subtitle = guild?.name ?? (entity.guildId ? "Server" : "Direct Messages");
            let iconUrl: string | undefined;

            if (guild?.icon) {
                iconUrl = IconUtils.getGuildIconURL({ id: guild.id, icon: guild.icon, size: 64 }) ?? undefined;
            } else if (channel.type === ChannelType.GROUP_DM) {
                const channelIcon = IconUtils.getChannelIconURL?.({
                    id: channel.id,
                    icon: (channel as { icon?: string | null; }).icon ?? undefined,
                    size: 64,
                });
                iconUrl = channelIcon ?? undefined;
            }

            if (!iconUrl && (channel.isDM() || channel.type === ChannelType.GROUP_DM)) {
                const recipientId = this.getDmRecipientId(channel);
                const recipient = recipientId ? UserStore.getUser(recipientId) : null;
                iconUrl = recipient ? recipient.getAvatarURL(void 0, 80, true) : undefined;
            }

            let badge = "channel";
            if (isThread) {
                badge = "thread";
            } else {
                switch (channel.type) {
                    case ChannelType.GUILD_VOICE:
                    case ChannelType.GUILD_STAGE_VOICE:
                        badge = "voice";
                        break;
                    case ChannelType.GUILD_FORUM:
                        badge = "forum";
                        break;
                    case ChannelType.GUILD_MEDIA:
                        badge = "media";
                        break;
                    case ChannelType.GUILD_ANNOUNCEMENT:
                        badge = "announcement";
                        break;
                    case ChannelType.DM:
                    case ChannelType.GROUP_DM:
                        badge = "dm";
                        break;
                    default:
                        badge = "channel";
                }
            }

            return { kind: "channel", title, subtitle, iconUrl, badge, entityId: entity.id, exiting: false };
        }

        const guild = GuildStore.getGuild(entity.id);
        const title = guild?.name ?? "Server";
        const subtitle = "Server";
        const iconUrl = guild?.icon
            ? IconUtils.getGuildIconURL({ id: guild.id, icon: guild.icon, size: 64 }) ?? undefined
            : undefined;
        const symbol = guild ? getGuildAcronym(guild) : "S";
        return { kind: "guild", title, subtitle, iconUrl, symbol, badge: "server", entityId: entity.id, exiting: false };
    },

    getDmRecipientId(channel?: Channel | null): string | null {
        if (!channel) return null;
        return channel.getRecipientId()
            ?? channel.recipients?.[0]
            ?? channel.rawRecipients?.[0]
            ?? null;
    },

    getGroupDmDisplayName(channel?: Channel | null): string | null {
        if (!channel || channel.type !== ChannelType.GROUP_DM) return null;

        const selfId = UserStore.getCurrentUser()?.id ?? null;
        const recipients = (channel.recipients ?? channel.rawRecipients ?? []).filter(Boolean);
        if (recipients.length === 0) return null;

        const names = recipients
            .filter(id => id !== selfId)
            .map(id => {
                const user = UserStore.getUser(id);
                return RelationshipStore?.getNickname?.(id)
                    ?? user?.globalName
                    ?? user?.username
                    ?? null;
            })
            .filter(Boolean);
        return names.length > 1 ? names.join(", ") : null;
    },
});
