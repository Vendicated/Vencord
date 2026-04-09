/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Channel, User } from "@vencord/discord-types";

import { extractChannelFromUrl, extractChannelPath, extractSnowflakeFromString, extractUserFromAvatar, extractUserFromProfile } from "./utils";

export type ChannelTarget = { id: string; guildId?: string; };

export type ResolvedDragTarget = {
    hasAttachment: boolean;
    hasMessageInput: boolean;
    hasChatBody: boolean;
    hasDragifyUser: boolean;
    hasUserMarker: boolean;
    hasTextNode: boolean;
    userId: string | null;
    avatarUserId: string | null;
    authorId: string | null;
    channel: ChannelTarget | null;
    guildId: string | null;
};

type InspectionContext = {
    ChannelStore: { getChannel(id: string): Channel | null | undefined; };
    UserStore: { getUser(id: string): User | null | undefined; };
    getDmRecipientId(channel?: Channel | null): string | null;
};

const messageInputSelector = "[data-slate-editor],[role=\"textbox\"],[contenteditable=\"true\"],[aria-label^=\"Message \"]";
const chatBodySelector = "[role=\"log\"],[data-list-id^=\"chat-messages\"]";

function collectEventElements(event: DragEvent): HTMLElement[] {
    const seen = new Set<HTMLElement>();
    const elements: HTMLElement[] = [];

    const add = (value: unknown) => {
        if (!(value instanceof HTMLElement) || seen.has(value)) return;
        seen.add(value);
        elements.push(value);
    };

    add(event.target);
    for (const entry of event.composedPath?.() ?? []) add(entry);

    if (typeof document !== "undefined" && event.clientX != null && event.clientY != null) {
        for (const element of document.elementsFromPoint?.(event.clientX, event.clientY) ?? []) add(element);
    }

    return elements;
}

function collectAncestors(elements: HTMLElement[]): HTMLElement[] {
    const seen = new Set<HTMLElement>();
    const ancestors: HTMLElement[] = [];

    for (const element of elements) {
        let current: HTMLElement | null = element;
        while (current) {
            if (!seen.has(current)) {
                seen.add(current);
                ancestors.push(current);
            }
            current = current.parentElement;
        }
    }

    return ancestors;
}

function resolveChannelTarget(element: HTMLElement): ChannelTarget | null {
    const listId = element.getAttribute("data-list-id") ?? "";
    const rawId = element.getAttribute("data-list-item-id") ?? "";
    const channelIdAttr = element.getAttribute("data-channel-id") ?? element.getAttribute("data-item-id") ?? "";
    const threadIdAttr = element.getAttribute("data-thread-id") ?? "";
    const href = element.getAttribute("href") ?? "";
    const isChannelContext = /(channel|thread|private|forum)/i.test(listId) || /(channel|thread|private|forum)/i.test(rawId);

    const pathMatch = extractChannelPath(href);
    if (pathMatch?.channelId) {
        return {
            id: pathMatch.channelId,
            guildId: pathMatch.guildId === "@me" ? undefined : pathMatch.guildId,
        };
    }

    const fullMatch = extractChannelFromUrl(href);
    if (fullMatch?.channelId) {
        return {
            id: fullMatch.channelId,
            guildId: fullMatch.guildId === "@me" ? undefined : fullMatch.guildId,
        };
    }

    const candidate = isChannelContext
        ? (extractSnowflakeFromString(threadIdAttr)
            ?? extractSnowflakeFromString(channelIdAttr)
            ?? extractSnowflakeFromString(rawId)
            ?? extractSnowflakeFromString(listId))
        : null;
    if (!candidate) return null;

    return {
        id: candidate,
        guildId: extractSnowflakeFromString(element.getAttribute("data-guild-id") ?? "") ?? undefined,
    };
}

function resolveGuildId(element: HTMLElement): string | null {
    const listId = element.getAttribute("data-list-id");
    const rawId = element.getAttribute("data-list-item-id") ?? "";
    const isGuildContext = (listId && /guild/i.test(listId)) || /guild/i.test(rawId);
    if (!isGuildContext) return null;

    const parts = rawId.split("___");
    const candidate = parts[parts.length - 1] ?? rawId;
    if (/^\d{17,20}$/.test(candidate)) return candidate;

    return extractSnowflakeFromString(rawId)
        ?? extractSnowflakeFromString(listId ?? "")
        ?? extractSnowflakeFromString(element.getAttribute("data-guild-id") ?? "");
}

function resolveUserId(element: HTMLElement, context: InspectionContext): string | null {
    const dataUserId = element.getAttribute("data-user-id") ?? element.getAttribute("data-userid") ?? "";
    const dataAuthorId = element.getAttribute("data-author-id") ?? "";
    const listId = element.getAttribute("data-list-item-id") ?? element.getAttribute("data-item-id") ?? "";
    const href = element.getAttribute("href") ?? "";
    const src = element.getAttribute("src") ?? "";
    const aria = element.getAttribute("aria-label") ?? "";

    const explicit = extractSnowflakeFromString(dataUserId) ?? extractSnowflakeFromString(dataAuthorId);
    if (explicit) return explicit;

    const listCandidate = extractSnowflakeFromString(listId);
    if (listCandidate) {
        if (context.UserStore.getUser(listCandidate)) return listCandidate;

        const channel = context.ChannelStore.getChannel(listCandidate);
        if (channel && channel.isDM() && !channel.isGroupDM() && !channel.isMultiUserDM()) {
            const recipientId = context.getDmRecipientId(channel);
            if (recipientId) return recipientId;
        }
    }

    const profile = extractUserFromProfile(href);
    if (profile) return profile;

    const avatar = extractUserFromAvatar(src);
    if (avatar) return avatar;

    const styleAttr = element.getAttribute("style") ?? "";
    const bgImage = element.style?.backgroundImage ?? "";
    const styleAvatar = extractUserFromAvatar(`${styleAttr} ${bgImage}`);
    if (styleAvatar) return styleAvatar;

    const ariaMatch = extractSnowflakeFromString(aria);
    if (ariaMatch && context.UserStore.getUser(ariaMatch)) return ariaMatch;

    return null;
}

function resolveAvatarUserId(element: HTMLElement) {
    const src = element.getAttribute("src") ?? "";
    const styleAttr = element.getAttribute("style") ?? "";
    const bgImage = element.style?.backgroundImage ?? "";
    return extractUserFromAvatar(`${src} ${styleAttr} ${bgImage}`);
}

export function inspectDragEvent(event: DragEvent, context: InspectionContext): ResolvedDragTarget {
    return inspectElements(collectEventElements(event), context);
}

export function inspectElement(target: HTMLElement | null, context: InspectionContext): ResolvedDragTarget {
    return inspectElements(target ? [target] : [], context);
}

function inspectElements(elements: HTMLElement[], context: InspectionContext): ResolvedDragTarget {
    const resolved: ResolvedDragTarget = {
        hasAttachment: false,
        hasMessageInput: false,
        hasChatBody: false,
        hasDragifyUser: false,
        hasUserMarker: false,
        hasTextNode: elements.some(element => element.getAttribute("data-text") != null),
        userId: null,
        avatarUserId: null,
        authorId: null,
        channel: null,
        guildId: null,
    };

    for (const element of collectAncestors(elements)) {
        resolved.hasMessageInput ||= element.matches(messageInputSelector);
        resolved.hasChatBody ||= element.matches(chatBodySelector);
        resolved.hasDragifyUser ||= element.getAttribute("data-dragify-user") != null;
        resolved.hasUserMarker ||= element.getAttribute("data-user-id") != null || element.getAttribute("data-userid") != null;
        resolved.authorId ??= extractSnowflakeFromString(element.getAttribute("data-author-id") ?? "");

        const href = element.getAttribute("href") ?? "";
        const src = element.getAttribute("src") ?? "";
        const style = element.style?.backgroundImage ?? "";
        const dataAttachment =
            element.getAttribute("data-attachment-id")
            ?? element.getAttribute("data-attachment-type")
            ?? element.getAttribute("data-attachment-item-id")
            ?? "";
        const combined = `${href} ${src} ${style}`;
        resolved.hasAttachment ||= Boolean(dataAttachment)
            || /(?:cdn|media)\.discordapp\.(?:com|net)\/attachments\//i.test(combined)
            || /discord\.com\/attachments\//i.test(combined)
            || /cdn\.discordapp\.com\/ephemeral-attachments\//i.test(combined);

        resolved.userId ??= resolveUserId(element, context);
        resolved.avatarUserId ??= resolveAvatarUserId(element);
        resolved.channel ??= resolveChannelTarget(element);
        resolved.guildId ??= resolveGuildId(element);
    }

    return resolved;
}
