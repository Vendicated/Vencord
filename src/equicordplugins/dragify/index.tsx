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
import { ChannelStore, DraftActions, DraftStore, DraftType, GuildChannelStore, GuildStore, IconUtils, PermissionsBits, PermissionStore, RelationshipStore, RestAPI, SelectedChannelStore, showToast, Toasts, UserStore } from "@webpack/common";

import { type GhostState, hideGhost as hideDragGhost, isGhostVisible, mountGhost as mountDragGhost, scheduleGhostPosition as scheduleDragGhostPosition, showGhost as showDragGhost, unmountGhost as unmountDragGhost } from "./ghost";
import { collectPayloadStrings, type DropEntity, extractChannelFromUrl, extractChannelPath, extractSnowflakeFromString, extractUserFromAvatar, extractUserFromProfile, parseFromStrings, tryParseJson } from "./utils";

const logger = new Logger("Dragify");
type DragifyRuntime = {
    onDrop(event: DragEvent, channel?: Channel | null): Promise<void>;
    isMessageInputEvent(event: DragEvent): boolean;
    isAttachmentElement(target: Element | null): boolean;
    isMessageInputElement(el: Element | null): boolean;
    extractUserIdFromTarget(target: Element | null): string | null;
    extractUserIdFromEvent(event: DragEvent): string | null;
    onUserDragStart(event: DragEvent, user?: { id: string; userId?: string; user?: { id: string; }; }): void;
    extractAvatarUserIdFromTarget(target: HTMLElement | null): string | null;
    extractChannelIdFromTarget(target: HTMLElement | null): { id: string; guildId?: string; } | null;
    onChannelDragStart(event: DragEvent, channel?: Pick<Channel, "id" | "guild_id"> | { id: string; guildId?: string; }): void;
    extractGuildIdFromTarget(target: HTMLElement): string | null;
    showGhost(entity: DropEntity, event?: DragEvent): void;
};

let pluginInstance: DragifyRuntime | null = null;
let activeGuildDragId: string | null = null;
let activeUserDragId: string | null = null;
let activeDragEntity: DropEntity | null = null;
let lastDropAt = 0;
let lastHandledDrop: { at: number; key: string; } = { at: 0, key: "" };
let lastDragEventAt = 0;
let guildGhostCleanupTimer: number | null = null;
let dragifyActive = false;
let dragStateWatchdog: number | null = null;
let dragSourceIsInput = false;
const dropDedupeWindowMs = 150;
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

function shouldIgnoreDrop(key: string): boolean {
    const now = Date.now();
    if (lastHandledDrop.key === key && now - lastHandledDrop.at < dropDedupeWindowMs) return true;
    lastHandledDrop = { key, at: now };
    return false;
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

function clearDragState() {
    activeUserDragId = null;
    activeGuildDragId = null;
    activeDragEntity = null;
    dragifyActive = false;
    dragSourceIsInput = false;
}

function setDragifyDataTransfer(dataTransfer: DataTransfer | null, payload: string) {
    if (!dataTransfer) return;
    if (dataTransfer.clearData) {
        dataTransfer.clearData("text/plain");
        dataTransfer.clearData("text/uri-list");
        dataTransfer.clearData("text/html");
    }
    dataTransfer.setData("application/json", payload);
    dataTransfer.setData("application/dragify", payload);
    dataTransfer.setData("text/plain", "");
}

function hasDragifyTransfer(dataTransfer?: DataTransfer | null) {
    return dataTransfer?.types?.includes("application/dragify");
}
const inviteCache = new Map<string, { code: string; expiresAt: number | null; maxUses: number | null; uses: number | null; }>();

export default definePlugin({
    name: "Dragify",
    description: "Drop users, channels, or servers into chat to insert mentions or invites.",
    authors: [EquicordDevs.justjxke],
    settings,

    patches: [
        // Voice user rows (voice channel sidebar list)
        {
            find: '"system:click_outside","user:escape"',
            replacement: {
                match: /(?<=GuildChannelUserContextMenu.{0,100})"data-dnd-name":(\i)\.name,/,
                replace: "$&\"data-dragify-user\":!0,\"data-user-id\":arguments[0].user?.id,draggable:!0,onDragStart:e=>$self.onUserDragStart(e,arguments[0].user),"
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
                    match: /(?<=getModeClass\(\),.{0,50})"data-dnd-name":(\i)\.name,children:\[/,
                    replace: "draggable:!0,onDragStart:e=>$self.onChannelDragStart(e,{id:this?.props?.channel?.id,guild_id:this?.props?.channel?.guild_id}),$&"
                }
            ]
        },
        // Voice channel rows (alternate voice list implementation)
        {
            find: "handleClickChat",
            replacement: {
                match: /(?<=getModeClass\(\),.{0,50})"data-dnd-name":(\i)\.name,/,
                replace: "$&draggable:!0,onDragStart:t=>$self.onChannelDragStart(t,{id:this?.props?.channel?.id,guild_id:this?.props?.channel?.guild_id}),"
            }
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
                match: /(?<=getClassName\(\).{0,50})"data-dnd-name":(\i)\.name,/,
                replace: "$&draggable:!0,onDragStart:e=>$self.onChannelDragStart(e,{id:this?.props?.channel?.id,guild_id:this?.props?.channel?.guild_id}),"
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
        if (dragSourceIsInput) return;
        const { dataTransfer } = event;
        if (!dataTransfer || dataTransfer.files?.length) return;

        const dragifyData = dataTransfer.getData("application/dragify");
        const hasActiveEntity = activeDragEntity || activeUserDragId || activeGuildDragId;
        if (dragifyData || hasActiveEntity) {
            lastDropAt = Date.now();
            event.preventDefault();
            event.stopPropagation();
        }

        const resolvedChannel = channel
            ?? (SelectedChannelStore?.getChannelId?.()
                ? ChannelStore.getChannel(SelectedChannelStore.getChannelId())
                : null);
        if (!resolvedChannel) return;

        if (dragifyData) {
            const parsed = tryParseJson<{ kind?: string; id?: string; guildId?: string; }>(dragifyData);
            if (parsed?.kind && parsed.id) {
                let fromDragify: DropEntity | null = null;
                switch (parsed.kind) {
                    case "user":
                        fromDragify = { kind: "user", id: parsed.id };
                        break;
                    case "channel":
                        fromDragify = { kind: "channel", id: parsed.id, guildId: parsed.guildId };
                        break;
                    case "guild":
                        fromDragify = { kind: "guild", id: parsed.id };
                        break;
                }
                if (fromDragify) {
                    const key = `${fromDragify.kind}:${fromDragify.id}:${resolvedChannel.id}`;
                    if (shouldIgnoreDrop(key)) return;
                    await this.handleDropEntity(fromDragify, resolvedChannel);
                    return;
                }
            }
        }

        const payloads = await collectPayloadStrings(dataTransfer);
        let entity = parseFromStrings(payloads, { ChannelStore, GuildStore, UserStore });
        if (!entity && activeDragEntity) {
            entity = activeDragEntity;
        } else if (!entity && activeUserDragId) {
            entity = { kind: "user", id: activeUserDragId };
        } else if (!entity && activeGuildDragId) {
            entity = { kind: "guild", id: activeGuildDragId };
        }
        if (!entity) {
            return;
        }

        const key = `${entity.kind}:${entity.id}:${resolvedChannel.id}`;
        if (shouldIgnoreDrop(key)) return;
        await this.handleDropEntity(entity, resolvedChannel);
    },

    async handleDropEntity(entity: DropEntity, channel: Channel) {
        try {
            const text = await this.buildText(entity, channel);
            if (!text) {
                clearDragState();
                return;
            }
            let inserted = false;
            if (entity.kind === "user") {
                inserted = this.insertText(channel.id, text, { removeUnknownUser: true });
            } else {
                inserted = this.insertText(channel.id, text);
            }
            if (!inserted) throw new Error("Unable to insert drag content");
            clearDragState();
        } catch (error) {
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
                return await this.createInvite(entity.id, currentChannel);
            default:
                return null;
        }
    },

    formatChannel(channelId: string, guildId?: string): string | null {
        const channel = ChannelStore.getChannel(channelId);
        if (!channel) return null;
        if (channel.isGroupDM() || channel.isMultiUserDM()) {
            return settings.store.userOutput === "id"
                ? channelId
                : `https://discord.com/channels/@me/${channelId}`;
        }
        if (settings.store.channelOutput === "link") {
            const effectiveGuildId = guildId ?? channel?.guild_id ?? "@me";
            return `https://discord.com/channels/${effectiveGuildId}/${channelId}`;
        }
        return `<#${channelId}>`;
    },

    async createInvite(guildId: string, currentChannel: Channel): Promise<string | null> {
        const inviteChannel = this.findInviteChannel(guildId, currentChannel);
        const fallbackChannelId = inviteChannel ? null : await this.fetchInviteChannelId(guildId);

        if (settings.store.reuseExistingInvites) {
            const cached = inviteCache.get(guildId);
            if (cached && cached.maxUses === null && !this.isInviteExpired(cached)) return `https://discord.gg/${cached.code}`;
            const reused = await this.fetchReusableInvite(guildId, inviteChannel ?? null);
            if (reused) return `https://discord.gg/${reused}`;
        }

        const inviteChannelId = inviteChannel?.id ?? fallbackChannelId;
        if (!inviteChannelId) {
            showToast("No channel available for invites.", Toasts.Type.FAILURE);
            return null;
        }
        if (inviteChannel && inviteChannel.guild_id !== guildId) {
            showToast("No channel available for invites.", Toasts.Type.FAILURE);
            return null;
        }

        try {
            const maxAge = settings.store.inviteExpireAfter ?? 0;
            const maxUses = settings.store.inviteMaxUses ?? 0;
            const { body } = await RestAPI.post({
                url: `/channels/${inviteChannelId}/invites`,
                body: {
                    max_age: maxAge,
                    max_uses: maxUses,
                    temporary: settings.store.inviteTemporaryMembership,
                    unique: true,
                },
            });
            const code = typeof body === "object" && body ? (body as { code?: string; }).code : null;
            if (!code) throw new Error("Invite response missing code");
            inviteCache.set(guildId, {
                code,
                expiresAt: maxAge > 0 ? Date.now() + maxAge * 1000 : null,
                maxUses: maxUses === 0 ? null : maxUses,
                uses: 0,
            });
            showToast("Invite created.", Toasts.Type.SUCCESS);
            return `https://discord.gg/${code}`;
        } catch (error) {
            logger.error("Failed to create invite", error);
            showToast("Unable to create invite.", Toasts.Type.FAILURE); // uh oh!
            return null;
        }
    },

    async fetchInviteChannelId(guildId: string): Promise<string | null> {
        try {
            const { body } = await RestAPI.get({ url: `/guilds/${guildId}/channels` });
            if (!Array.isArray(body)) return null;

            const candidates = body
                .filter(ch => ch && ch?.id)
                .filter(ch => {
                    const { type } = ch;
                    return type === ChannelType.GUILD_TEXT
                        || type === ChannelType.GUILD_ANNOUNCEMENT
                        || type === ChannelType.GUILD_FORUM
                        || type === ChannelType.GUILD_MEDIA;
                })
                .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

            return candidates[0]?.id ?? null;
        } catch {
            return null;
        }
    },

    async fetchReusableInvite(guildId: string, inviteChannel: Channel | null): Promise<string | null> {
        const cached = inviteCache.get(guildId);
        if (cached && cached.maxUses === null && !this.isInviteExpired(cached)) return cached.code;

        try {
            const channelId = inviteChannel?.id ?? null;
            const url = channelId ? `/channels/${channelId}/invites` : `/guilds/${guildId}/invites`;

            const { body } = await RestAPI.get({ url });
            if (!Array.isArray(body)) return null;

            const now = Date.now();
            const invite = body.find(inv => {
                const expiresAt = inv.expires_at ? Date.parse(inv.expires_at) : null;
                const maxUsesRaw = inv.max_uses ?? null;
                const maxUses = maxUsesRaw === 0 ? null : maxUsesRaw;
                const uses = inv.uses ?? null;
                const notExpired = expiresAt === null || expiresAt > now;
                const usesLeft = maxUses === null || uses === null || uses < maxUses;
                return notExpired && usesLeft && typeof inv.code === "string";
            });

            if (invite?.code) {
                inviteCache.set(guildId, {
                    code: invite.code,
                    expiresAt: invite.expires_at ? Date.parse(invite.expires_at) : null,
                    maxUses: invite.max_uses === 0 ? null : invite.max_uses ?? null,
                    uses: invite.uses ?? null,
                });
                return invite.code;
            }
        } catch {
            // If we cannot list invites (permissions/403), fall back silently.
            return null;
        }

        return null;
    },

    isInviteExpired(invite: { expiresAt: number | null; maxUses: number | null; uses: number | null; }): boolean {
        const now = Date.now();
        const expired = invite.expiresAt !== null && invite.expiresAt <= now;
        const exhausted = invite.maxUses !== null && invite.uses !== null && invite.uses >= invite.maxUses;
        return expired || exhausted;
    },

    findInviteChannel(guildId: string, currentChannel: Channel): Channel | null {
        if (currentChannel.guild_id === guildId && this.canCreateInvite(currentChannel)) return currentChannel;

        const guild = GuildStore.getGuild(guildId);
        const preferredIds = [
            guild?.systemChannelId,
            guild?.rulesChannelId,
            guild?.publicUpdatesChannelId,
        ].filter(Boolean) as string[];
        for (const id of preferredIds) {
            const channel = ChannelStore.getChannel(id);
            if (this.canCreateInvite(channel)) return channel;
        }

        const selectableStore = (GuildChannelStore.getSelectableChannels?.(guildId) ?? [])
            .map(e => e.channel)
            .filter(Boolean) as Channel[];
        const selectableCollection = (() => {
            const collection = GuildChannelStore.getChannels(guildId);
            if (!collection?.SELECTABLE) return [];

            const result: Channel[] = [];
            for (const entry of Object.values(collection.SELECTABLE)) {
                const channel = entry && entry?.channel ? entry.channel : entry;
                if (channel) result.push(channel);
            }
            return result;
        })();

        const byId = new Map<string, Channel>();
        for (const ch of [...selectableStore, ...selectableCollection]) {
            if (!ch || ch.guild_id !== guildId) continue;
            if (!byId.has(ch.id)) byId.set(ch.id, ch);
        }
        const candidates = [...byId.values()]
            .sort((a, b) => {
                const pa = typeof a.position === "number" ? a.position : 0;
                const pb = typeof b.position === "number" ? b.position : 0;
                if (pa === pb) return a.id.localeCompare(b.id);
                return pa - pb;
            });

        for (const channel of candidates) {
            if (this.canCreateInvite(channel)) return channel;
        }

        return null;
    },

    canCreateInvite(channel?: Channel | null): channel is Channel {
        if (!channel || !channel.guild_id) return false;
        if (channel.isDM() || channel.isGroupDM() || channel.isMultiUserDM()) return false;
        if (channel.isCategory()) return false;
        if (channel.isThread()) return false;
        return PermissionStore.can(PermissionsBits.CREATE_INSTANT_INVITE, channel);
    },

    insertText(channelId: string, text: string, options?: { removeUnknownUser?: boolean; }): boolean {
        let insertedIntoInput = false;
        let insertedIntoDraft = false;

        try {
            insertTextIntoChatInputBox(text);
            insertedIntoInput = true;
        } catch (error) {
            logger.error("Failed to insert text into input", error);
        }

        try {
            let existing = DraftStore.getDraft(channelId, DraftType.ChannelMessage) ?? "";
            if (options?.removeUnknownUser) existing = existing.replace(/@unknown[- ]user/gi, "").trim();

            const needsSpace = existing.length > 0 && !existing.endsWith(" ");
            const nextValue = needsSpace ? `${existing} ${text}` : `${existing}${text}`;

            !existing ? DraftActions.saveDraft(channelId, nextValue, DraftType.ChannelMessage) : DraftActions.changeDraft(channelId, nextValue, DraftType.ChannelMessage);
            insertedIntoDraft = true;
        } catch (error) {
            logger.error("Failed to update draft", error);
        }

        return insertedIntoInput || insertedIntoDraft;
    },

    onChannelDragStart(event: DragEvent, channel?: Pick<Channel, "id" | "guild_id"> | { id: string; guildId?: string; }) {
        if (activeUserDragId) return;
        const existingDragify = event.dataTransfer?.getData("application/dragify") ?? "";
        if (existingDragify) {
            const parsed = tryParseJson<{ kind?: string; }>(existingDragify);
            if (parsed?.kind === "user") return;
        }
        const targetEl = event.target as HTMLElement | null;
        if (targetEl?.closest?.("[data-dragify-user]")) return;

        const targetResolved = this.extractChannelIdFromTarget(event.target as HTMLElement | null);
        const resolved =
            channel && "id" in channel && channel.id
                ? channel
                : targetResolved;
        if (!resolved?.id) return;

        const channelObj = ChannelStore.getChannel(resolved.id);
        if (!channelObj) return;
        const resolvedGuildId = resolved ? ("guild_id" in resolved ? resolved.guild_id : resolved.guildId) : undefined;
        const guildId = resolvedGuildId ?? targetResolved?.guildId ?? channelObj?.guild_id;
        const isDirectMessage = channelObj.isDM();
        if (isDirectMessage) {
            const recipientId = this.getDmRecipientId(channelObj);
            if (recipientId) {
                this.onUserDragStart(event, { id: recipientId });
                return;
            }
        }
        suppressDefaultDragPreview(event);
        this.showGhost({ kind: "channel", id: channelObj.id, guildId }, event);
        const payload = JSON.stringify({ kind: "channel", id: channelObj.id, guildId });
        activeDragEntity = { kind: "channel", id: channelObj.id, guildId };
        dragifyActive = true;
        lastDragEventAt = Date.now();
        setDragifyDataTransfer(event.dataTransfer ?? null, payload);
    },

    onUserDragStart(event: DragEvent, user?: { id: string; userId?: string; user?: { id: string; }; }) {
        if (this.isAttachmentElement(event.target as HTMLElement | null)) return;
        const searchTarget = event.target as HTMLElement | null;
        if (searchTarget?.closest) {
            const chatMessage = searchTarget.closest("[data-author-id]") as HTMLElement | null;
            if (chatMessage) {
                const authorId = chatMessage.getAttribute("data-author-id");
                const parsed = authorId ? extractSnowflakeFromString(authorId) : null;
                if (parsed) {
                    user = { id: parsed };
                }
            }
        }
        const currentTarget = (event as unknown as { currentTarget?: EventTarget | null; }).currentTarget as HTMLElement | null;
        const target = (event.target as HTMLElement | null) ?? null;
        const userIdFromParam = user?.id ?? user?.userId ?? user?.user?.id ?? null;
        const userIdFromDom =
            this.extractUserIdFromTarget(currentTarget)
            ?? this.extractUserIdFromTarget(target)
            ?? null;
        const userIdFromEvent = this.extractUserIdFromEvent(event);
        const rawUserId =
            userIdFromParam
            ?? userIdFromDom
            ?? userIdFromEvent
            ?? event.dataTransfer?.getData("data-user-id")
            ?? null;
        const userId = rawUserId ? (extractSnowflakeFromString(rawUserId) ?? rawUserId) : null;
        if (!userId) return;
        const payload = JSON.stringify({ kind: "user", id: userId });
        activeUserDragId = userId;
        activeDragEntity = { kind: "user", id: userId };
        dragifyActive = true;
        lastDragEventAt = Date.now();
        suppressDefaultDragPreview(event);
        this.showGhost({ kind: "user", id: userId }, event);
        setDragifyDataTransfer(event.dataTransfer ?? null, payload);
        event.dataTransfer?.setData("data-user-id", userId);
    },

    onDmDragStart(event: DragEvent, channel?: Channel | null) {
        let resolvedChannel = channel ?? null;
        if (!resolvedChannel) {
            const targetChannel = this.extractChannelIdFromTarget(event.target as HTMLElement | null);
            if (targetChannel?.id) resolvedChannel = ChannelStore.getChannel(targetChannel.id) ?? null;
        }
        if (!resolvedChannel) return;
        const shouldDragChannel = resolvedChannel.isGroupDM() && resolvedChannel.isMultiUserDM();
        if (!shouldDragChannel) {
            const recipientId = this.getDmRecipientId(resolvedChannel);
            if (recipientId) {
                this.onUserDragStart(event, { id: recipientId });
                return;
            }
        }

        this.onChannelDragStart(event, resolvedChannel);
    },

    onGuildDragStart(event: DragEvent, guildId: string) {
        suppressDefaultDragPreview(event);
        this.showGhost({ kind: "guild", id: guildId }, event);
        const payload = JSON.stringify({ kind: "guild", id: guildId });
        if (event.dataTransfer) event.dataTransfer.effectAllowed = "copyMove";
        activeGuildDragId = guildId;
        activeDragEntity = { kind: "guild", id: guildId };
        dragifyActive = true;
        lastDragEventAt = Date.now();
        setDragifyDataTransfer(event.dataTransfer ?? null, payload);
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
        if (dragStateWatchdog === null) {
            dragStateWatchdog = window.setInterval(() => {
                if (!dragifyActive) return;
                if (Date.now() - lastDragEventAt < 1200) return;
                activeUserDragId = null;
                activeGuildDragId = null;
                activeDragEntity = null;
                dragifyActive = false;
                hideDragGhost();
            }, 500);
        }
    },

    stop() {
        window.removeEventListener("dragover", this.globalDragOver, true);
        window.removeEventListener("drop", this.globalDrop, true);
        window.removeEventListener("dragstart", this.globalDragStart, true);
        window.removeEventListener("drag", this.globalDragMove, true);
        window.removeEventListener("dragover", this.globalDragMove, true);
        window.removeEventListener("dragend", this.globalDragEnd, true);
        clearDragState();
        inviteCache.clear();
        if (guildGhostCleanupTimer !== null) {
            clearTimeout(guildGhostCleanupTimer);
            guildGhostCleanupTimer = null;
        }
        if (dragStateWatchdog !== null) {
            clearInterval(dragStateWatchdog);
            dragStateWatchdog = null;
        }
        this.unmountGhost();
        pluginInstance = null;
    },

    globalDragOver: (event: DragEvent) => {
        const inst = pluginInstance;
        if (!inst || !inst.isMessageInputEvent(event)) return;
        if (dragSourceIsInput) return;
        if (event.dataTransfer?.files?.length) return;
        const hasActiveGuildDrag = activeGuildDragId !== null;
        const hasActiveEntity = activeDragEntity || activeUserDragId;
        const shouldHandle = hasActiveGuildDrag || hasActiveEntity || dragifyActive || hasDragifyTransfer(event.dataTransfer);
        if (!shouldHandle) return;
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    },

    globalDrop: async (event: DragEvent) => {
        const inst = pluginInstance;
        if (!inst || !inst.isMessageInputEvent(event)) return;
        if (dragSourceIsInput) return;
        if (event.dataTransfer?.files?.length) {
            clearDragState();
            return;
        }
        const channelId = SelectedChannelStore.getChannelId();
        const channel = ChannelStore.getChannel(channelId);
        if (!channel) return;

        const types = event.dataTransfer?.types ?? [];
        const hasDragify = types.includes("application/dragify");
        const hasAnyActiveDrag = activeGuildDragId !== null || activeUserDragId !== null || activeDragEntity !== null || dragifyActive;
        if (!hasDragify && !hasAnyActiveDrag) return;

        lastDropAt = Date.now();
        event.preventDefault();
        event.stopPropagation();
        await inst.onDrop(event, channel);
        hideDragGhost();
    },

    globalDragStart: (event: DragEvent) => {
        const inst = pluginInstance;
        if (!inst || !event.dataTransfer) return;

        const target = event.target as HTMLElement | null;
        if (!target) return;
        const hasDragify = event.dataTransfer.types?.includes("application/dragify") ?? false;
        const path = event.composedPath?.() ?? [];
        if (inst.isAttachmentElement(target)) return;
        if (inst.isMessageInputElement(target)) {
            clearDragState();
            dragSourceIsInput = true;
            return;
        }
        for (const entry of path) {
            const el = entry as Element | null;
            if (!el) continue;
            if (inst.isAttachmentElement(el)) return;
            if (inst.isMessageInputElement(el)) {
                clearDragState();
                dragSourceIsInput = true;
                return;
            }
        }

        if (!hasDragify) {
            for (const entry of path) {
                const el = entry as HTMLElement | null;
                if (!el) continue;
                const userTarget = el.closest?.("[data-dragify-user]");
                if (!userTarget) continue;
                const userId = inst.extractUserIdFromTarget(userTarget);
                if (userId) {
                    inst.onUserDragStart(event, { id: userId });
                }
                return;
            }
        }

        const authorContainer = target.closest?.("[data-author-id]");
        const authorId = authorContainer?.getAttribute?.("data-author-id") ?? null;
        if (authorId && target.getAttribute?.("data-text") && !hasDragify) {
            inst.onUserDragStart(event, { id: authorId });
            return;
        }

        if (!hasDragify) {
            const dragifyTarget = target.closest?.("[data-dragify-user]");
            if (dragifyTarget) {
                const userIdFromTarget = inst.extractUserIdFromEvent(event) ?? inst.extractUserIdFromTarget(dragifyTarget);
                if (userIdFromTarget) {
                    inst.onUserDragStart(event, { id: userIdFromTarget });
                    return;
                }
            }
        }

        if (!hasDragify) {
            const avatarUserId = inst.extractAvatarUserIdFromTarget(target);
            if (avatarUserId) {
                const messageItem = target.closest?.("[data-author-id]") as HTMLElement | null;
                const authorId = messageItem?.getAttribute("data-author-id") ?? null;
                if (authorId) {
                    inst.onUserDragStart(event, { id: authorId });
                    return;
                }
                const channelFromTarget = inst.extractChannelIdFromTarget(target);
                if (channelFromTarget) {
                    inst.onChannelDragStart(event, channelFromTarget);
                    return;
                }
            }
        }

        const channelFromTarget = inst.extractChannelIdFromTarget(target);
        if (channelFromTarget && !hasDragify) {
            if (target.closest?.("[data-user-id]")) return;
            inst.onChannelDragStart(event, channelFromTarget);
            return;
        }

        const guildId = inst.extractGuildIdFromTarget(target);
        if (!guildId) return;

        if (!hasDragify) {
            event.dataTransfer.effectAllowed = "copyMove";
            suppressDefaultDragPreview(event);
            activeGuildDragId = guildId;
            setDragifyDataTransfer(event.dataTransfer, JSON.stringify({ kind: "guild", id: guildId }));
            inst.showGhost({ kind: "guild", id: guildId }, event);
        }
    },
    globalDragEnd: (_event: DragEvent) => {
        setTimeout(() => {
            if (Date.now() - lastDropAt < 100) return;
            clearDragState();
            hideDragGhost();
        }, 0);
    },
    globalDragMove: (event: DragEvent | MouseEvent) => {
        if (!isGhostVisible()) return;
        if (event?.clientX == null || event?.clientY == null) return;
        if (event instanceof DragEvent) {
            lastDragEventAt = Date.now();
            if (activeGuildDragId !== null || activeDragEntity?.kind === "guild") {
                if (guildGhostCleanupTimer !== null) clearTimeout(guildGhostCleanupTimer);
                guildGhostCleanupTimer = window.setTimeout(() => {
                    if (Date.now() - lastDragEventAt < 200) return;
                    activeGuildDragId = null;
                    if (activeDragEntity?.kind === "guild") activeDragEntity = null;
                    hideDragGhost();
                }, 300);
            }
        }
        scheduleDragGhostPosition(event.clientX + 16, event.clientY + 20);
    },
    isMessageInputEvent(event: DragEvent): boolean {
        const target = event.target as Element | null;
        if (this.isMessageInputElement(target)) return true;
        if (settings.store.allowChatBodyDrop && this.isChatBodyElement(target)) return true;

        const path = event.composedPath?.() ?? [];
        for (const entry of path) {
            const el = entry as Element | null;
            if (this.isMessageInputElement(el)) return true;
            if (settings.store.allowChatBodyDrop && this.isChatBodyElement(el)) return true;
        }

        if (typeof document !== "undefined" && event?.clientX != null && event?.clientY != null) {
            const elements = document.elementsFromPoint?.(event.clientX, event.clientY);
            if (elements && elements.length) {
                for (const el of elements) {
                    if (this.isMessageInputElement(el)) return true;
                    if (settings.store.allowChatBodyDrop && this.isChatBodyElement(el)) return true;
                }
            } else {
                const atPoint = document.elementFromPoint(event.clientX, event.clientY);
                if (this.isMessageInputElement(atPoint)) return true;
                if (settings.store.allowChatBodyDrop && this.isChatBodyElement(atPoint)) return true;
            }
        }

        return false;
    },

    isMessageInputElement(el: Element | null): boolean {
        if (!el) return false;
        const selector = "[data-slate-editor],[role=\"textbox\"],[contenteditable=\"true\"],[aria-label^=\"Message \"]";
        return Boolean((el as HTMLElement).closest?.(selector));
    },

    isChatBodyElement(el: Element | null): boolean {
        if (!el) return false;
        const selector = "[role=\"log\"],[data-list-id^=\"chat-messages\"]";
        return Boolean((el as HTMLElement).closest?.(selector));
    },

    isAttachmentElement(target: Element | null): boolean {
        let el: Element | null = target;
        while (el) {
            if (!(el instanceof HTMLElement)) {
                el = el.parentElement ?? null;
                continue;
            }
            const href = el.getAttribute("href") ?? "";
            const src = el.getAttribute("src") ?? "";
            const style = el.style?.backgroundImage ?? "";
            const dataAttachment =
                el.getAttribute("data-attachment-id")
                ?? el.getAttribute("data-attachment-type")
                ?? el.getAttribute("data-attachment-item-id")
                ?? "";

            if (dataAttachment) return true;

            const combined = `${href} ${src} ${style}`;
            if (/(?:cdn|media)\.discordapp\.(?:com|net)\/attachments\//i.test(combined)) return true;
            if (/discord\.com\/attachments\//i.test(combined)) return true;
            if (/cdn\.discordapp\.com\/ephemeral-attachments\//i.test(combined)) return true;

            el = el.parentElement;
        }
        return false;
    },

    extractGuildIdFromTarget(target: HTMLElement): string | null {
        let el: HTMLElement | null = target;
        while (el) {
            const listId = el.getAttribute("data-list-id");
            const rawId = el.getAttribute("data-list-item-id") ?? "";
            const isGuildContext = (listId && /guild/i.test(listId)) || /guild/i.test(rawId);

            if (!isGuildContext) {
                el = el.parentElement;
                continue;
            }

            const parts = rawId.split("___");
            const candidate = parts[parts.length - 1] ?? rawId;
            if (/^\d{17,20}$/.test(candidate)) return candidate;

            const direct =
                extractSnowflakeFromString(rawId) ??
                extractSnowflakeFromString(listId ?? "") ??
                extractSnowflakeFromString(el.getAttribute("data-guild-id") ?? "");
            if (direct) return direct;

            el = el.parentElement;
        }
        return null;
    },

    extractChannelIdFromTarget(target: HTMLElement | null): { id: string; guildId?: string; } | null {
        let el = target;
        while (el) {
            const listId = el.getAttribute("data-list-id") ?? "";
            const rawId = el.getAttribute("data-list-item-id") ?? "";
            const channelIdAttr = el.getAttribute("data-channel-id") ?? el.getAttribute("data-item-id") ?? "";
            const threadIdAttr = el.getAttribute("data-thread-id") ?? "";
            const href = el.getAttribute("href") ?? "";
            const isChannelContext = /(channel|thread|private|forum)/i.test(listId) || /(channel|thread|private|forum)/i.test(rawId);

            const pathMatch = extractChannelPath(href);
            if (pathMatch?.channelId) {
                const guildId = pathMatch.guildId === "@me" ? undefined : pathMatch.guildId;
                return { id: pathMatch.channelId, guildId };
            }

            const fullMatch = extractChannelFromUrl(href);
            if (fullMatch?.channelId) {
                const guildId = fullMatch.guildId === "@me" ? undefined : fullMatch.guildId;
                return { id: fullMatch.channelId, guildId };
            }

            const candidate = isChannelContext
                ? (extractSnowflakeFromString(threadIdAttr)
                    ?? extractSnowflakeFromString(channelIdAttr)
                    ?? extractSnowflakeFromString(rawId)
                    ?? extractSnowflakeFromString(listId))
                : null;
            if (candidate) {
                const guildId = extractSnowflakeFromString(el.getAttribute("data-guild-id") ?? "") ?? undefined;
                return { id: candidate, guildId };
            }

            el = el.parentElement;
        }
        return null;
    },

    extractUserIdFromTarget(target: Element | null): string | null {
        let el: Element | null = target;
        while (el) {
            if (!(el instanceof HTMLElement)) {
                el = el.parentElement ?? null;
                continue;
            }
            const dataUserId = el.getAttribute("data-user-id") ?? el.getAttribute("data-userid") ?? "";
            const dataAuthorId = el.getAttribute("data-author-id") ?? "";
            const listId = el.getAttribute("data-list-item-id") ?? el.getAttribute("data-item-id") ?? "";
            const href = el.getAttribute("href") ?? "";
            const src = el.getAttribute("src") ?? "";
            const aria = el.getAttribute("aria-label") ?? "";

            const explicit = extractSnowflakeFromString(dataUserId)
                ?? extractSnowflakeFromString(dataAuthorId);
            if (explicit) return explicit;

            const listCandidate = extractSnowflakeFromString(listId);
            if (listCandidate) {
                if (UserStore.getUser(listCandidate)) return listCandidate;
                const channel = ChannelStore.getChannel(listCandidate);
                if (channel && channel.isDM() && !channel.isGroupDM() && !channel.isMultiUserDM()) {
                    const recipientId = this.getDmRecipientId(channel);
                    if (recipientId) return recipientId;
                }
            }

            const profile = extractUserFromProfile(href);
            if (profile) return profile;

            const avatar = extractUserFromAvatar(src);
            if (avatar) return avatar;

            const styleAttr = el.getAttribute("style") ?? "";
            const bgImage = el.style?.backgroundImage ?? "";
            const styleAvatar = extractUserFromAvatar(styleAttr + " " + bgImage);
            if (styleAvatar) return styleAvatar;

            const ariaMatch = extractSnowflakeFromString(aria);
            if (ariaMatch && UserStore.getUser(ariaMatch)) return ariaMatch;

            el = el.parentElement;
        }
        return null;
    },

    extractAvatarUserIdFromTarget(target: HTMLElement | null): string | null {
        let el: Element | null = target;
        while (el) {
            if (!(el instanceof HTMLElement)) {
                el = el.parentElement ?? null;
                continue;
            }
            const src = el.getAttribute("src") ?? "";
            const styleAttr = el.getAttribute("style") ?? "";
            const bgImage = el.style?.backgroundImage ?? "";
            const candidate = extractUserFromAvatar(`${src} ${styleAttr} ${bgImage}`);
            if (candidate) return candidate;
            el = el.parentElement;
        }
        return null;
    },

    extractUserIdFromEvent(event: DragEvent): string | null {
        const path = event.composedPath?.() ?? [];
        for (const entry of path) {
            const candidate = entry instanceof HTMLElement ? this.extractUserIdFromTarget(entry) : null;
            if (candidate) return candidate;
        }

        const target = event.target as HTMLElement | null;
        if (target) {
            const direct = target.closest?.("[data-author-id],[data-user-id]") as HTMLElement | null;
            if (direct) {
                return this.extractUserIdFromTarget(direct);
            }
        }

        if (typeof document !== "undefined" && event?.clientX != null && event?.clientY != null) {
            const elements = document.elementsFromPoint?.(event.clientX, event.clientY);
            if (elements && elements.length) {
                for (const el of elements) {
                    const candidate = el instanceof HTMLElement ? this.extractUserIdFromTarget(el) : null;
                    if (candidate) return candidate;
                }
            }
        }

        return null;
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
        const position = event && event?.clientX != null && event?.clientY != null
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
            const guild = channel?.guild_id ? GuildStore.getGuild(channel.guild_id) : null;
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
