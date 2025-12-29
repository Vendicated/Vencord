/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { isPluginEnabled, plugins, startPlugin, stopPlugin } from "@api/PluginManager";
import { SettingsStore } from "@api/Settings";
import { getUserSettingLazy } from "@api/UserSettings";
import { openPluginModal } from "@components/settings/tabs";
import { toggleEnabled } from "@equicordplugins/equicordHelper/utils";
import type { Plugin } from "@utils/types";
import { changes, checkForUpdates } from "@utils/updater";
import { Guild } from "@vencord/discord-types";
import { findByPropsLazy, findStoreLazy } from "@webpack";
import { ChannelActionCreators, ChannelRouter, ChannelStore, ComponentDispatch, FluxDispatcher, GuildStore, MediaEngineStore, NavigationRouter, openUserSettingsPanel, React, ReadStateUtils, RelationshipStore, SelectedChannelStore, SelectedGuildStore, StreamerModeStore, Toasts, useEffect, UserStore, VoiceActions } from "@webpack/common";
import type { FC, ReactElement, ReactNode } from "react";
import { Settings } from "Vencord";

import commandPalette from ".";

type CommandHandler = () => void | Promise<void>;

type ToastKind = (typeof Toasts.Type)[keyof typeof Toasts.Type];

export interface CommandCategory {
    id: string;
    label: string;
    description?: string;
    parentId?: string | null;
}

export interface CommandEntry {
    id: string;
    label: string;
    description?: string;
    keywords?: string[];
    tags?: string[];
    categoryId?: string;
    shortcut?: string | null;
    handler: CommandHandler;
    danger?: boolean;
    hiddenInSearch?: boolean;
    searchGroup?: string;
}

export interface CommandTagMeta {
    id: string;
    label: string;
    count: number;
}

interface ClosedDmSnapshot {
    channelId?: string | null;
    recipientId?: string | null;
    isGroupDm?: boolean;
}

interface ChatBarCommandState {
    commandId: string;
    label: string;
    getters: Set<() => HTMLElement | null>;
}

export const chatBarCommandStates = new Map<string, ChatBarCommandState>();
export const chatBarCommandStatesById = new Map<string, ChatBarCommandState>();
const CHATBAR_DATASET_KEY = "vcCommandPaletteId";
const CHATBAR_DATA_ATTRIBUTE = "data-vc-command-palette-id";

const categories = new Map<string, CommandCategory>();
const registry = new Map<string, CommandEntry>();

let registryVersion = 0;
let cachedSortedCommands: CommandEntry[] | null = null;
const categoryCommandCache = new Map<string, CommandEntry[]>();
const treeCommandCache = new Map<string, CommandEntry[]>();
const searchTextCache = new Map<string, string>();
const registryListeners = new Set<(version: number) => void>();
const RECENT_COMMAND_LIMIT = 10;
const recentCommandIds: string[] = [];
const RECENT_COMMAND_SKIP_IDS = new Set<string>([
    "command-palette-rerun-last",
    "command-palette-toggle-pin-last",
    "command-palette-show-recent",
    "command-palette-open-settings"
]);
const StatusSetting = getUserSettingLazy<string>("status", "status");
const COMMAND_PALETTE_PLUGIN_NAME = "CommandPalette";
const CUSTOM_COMMANDS_KEY = "CommandPaletteCustomCommands";
const CUSTOM_COMMANDS_CATEGORY_ID = "custom-commands";
const SESSION_TOOLS_CATEGORY_ID = "session-tools";
const CONTEXT_PROVIDER_ID = "context-current";
const CUSTOM_PROVIDER_ID = "custom-commands";
const TOOLBOX_ACTIONS_CATEGORY_ID = "plugins-actions";
const TOOLBOX_ACTIONS_PROVIDER_ID = "plugin-toolbox-actions";
const CHATBAR_ACTIONS_CATEGORY_ID = "chatbar-actions";
const GUILD_CATEGORY_ID = "guilds-actions";
const FRIENDS_CATEGORY_ID = "friends-actions";

const commandTagIds = new Map<string, string[]>();
const tagMetadata = new Map<string, { label: string; count: number; }>();

const TAG_CORE = "Core";
const TAG_NAVIGATION = "Navigation";
const TAG_UTILITY = "Utility";
const TAG_DEVELOPER = "Developer";
const TAG_CUSTOMIZATION = "Customization";
const TAG_PLUGINS = "Plugins";
const TAG_SESSION = "Session";
const TAG_CONTEXT = "Context";
const TAG_CUSTOM = "Custom";
const TAG_GUILDS = "Guilds";
const TAG_FRIENDS = "Friends";

export function normalizeTag(tag: string): string {
    return tag.trim().toLowerCase();
}

export function wrapChatBarChildren(children: ReactNode): ReactNode {
    if (!Array.isArray(children) || children.length === 0) return children;

    let hasChanges = false;
    const wrappedChildren = children.map((child, index) => {
        if (!React.isValidElement(child)) return child;
        const childElement = child as ReactElement;
        if (childElement.type === ChatBarCommandBridge) return child;

        const existingKey = typeof childElement.key === "string" && childElement.key.length > 0
            ? childElement.key
            : undefined;
        const buttonKey = existingKey ?? `chatbar-${index}`;

        hasChanges = true;
        const bridgeProps: ChatBarCommandBridgeElementProps = {
            element: childElement,
            buttonKey,
            key: existingKey ?? buttonKey
        };

        return (
            <ChatBarCommandBridge key={existingKey} {...bridgeProps} />
        );
    });

    if (!hasChanges) return children;

    return wrappedChildren;
}

interface ChatBarCommandBridgeProps {
    element: ReactElement;
    buttonKey: string;
}

type ChatBarCommandBridgeElementProps = ChatBarCommandBridgeProps & { key?: string; };

export const ChatBarCommandBridge: FC<ChatBarCommandBridgeProps> = ({ element, buttonKey }) => {
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const latestElementRef = React.useRef(element);
    latestElementRef.current = element;

    useEffect(() => {
        let cancelled = false;
        let cleanup: (() => void) | null = null;
        let timeoutId: number | null = null;
        let delay = 16;

        const attachToChatBar = () => {
            if (cancelled) return;
            const container = containerRef.current;
            if (!container) {
                scheduleRetry();
                return;
            }

            const target = resolveChatBarElementFromContainer(container);
            if (!target) {
                scheduleRetry();
                return;
            }

            const label = extractChatBarLabel(target, latestElementRef.current, buttonKey);
            cleanup = attachChatBarInstance(buttonKey, label, container, target);
            delay = 16;
        };

        const scheduleRetry = () => {
            if (cancelled) return;
            const currentDelay = delay;
            delay = Math.min(delay * 2, 1000);
            timeoutId = window.setTimeout(attachToChatBar, currentDelay);
        };

        attachToChatBar();

        return () => {
            cancelled = true;
            if (timeoutId != null) window.clearTimeout(timeoutId);
            cleanup?.();
        };
    }, [buttonKey]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const state = chatBarCommandStates.get(buttonKey);
        if (!state) return;
        const target = resolveChatBarElement(state);
        if (!target) return;
        const label = extractChatBarLabel(target, latestElementRef.current, buttonKey);
        ensureChatBarCommandState(buttonKey, label);
    }, [element, buttonKey]);

    return (
        <div ref={containerRef} style={{ display: "contents" }}>
            {element}
        </div>
    );
};

export function resolveChatBarElementFromContainer(container: HTMLElement): HTMLElement | null {
    if (container.hasAttribute("aria-label")) return container;
    const labelled = container.querySelector<HTMLElement>("[aria-label]");
    return labelled ?? null;
}

export function attachChatBarInstance(buttonKey: string, label: string, container: HTMLElement, element: HTMLElement): () => void {
    const state = ensureChatBarCommandState(buttonKey, label);
    const { commandId } = state;

    element.dataset[CHATBAR_DATASET_KEY] = commandId;
    element.setAttribute(CHATBAR_DATA_ATTRIBUTE, commandId);

    const getter = () => {
        if (element.isConnected) return element;
        const scoped = container.querySelector<HTMLElement>(`[${CHATBAR_DATA_ATTRIBUTE}="${commandId}"]`);
        if (scoped) return scoped;
        return document.querySelector<HTMLElement>(`[${CHATBAR_DATA_ATTRIBUTE}="${commandId}"]`);
    };

    state.getters.add(getter);

    return () => {
        state.getters.delete(getter);
        if (state.getters.size === 0) {
            removeCommand(state.commandId);
            chatBarCommandStates.delete(buttonKey);
            chatBarCommandStatesById.delete(state.commandId);
        }
        element.removeAttribute(CHATBAR_DATA_ATTRIBUTE);
        delete (element.dataset as Record<string, string | undefined>)[CHATBAR_DATASET_KEY];
    };
}

export function extractChatBarLabel(element: HTMLElement | null, reactElement: ReactElement | null, fallback: string): string {
    const aria = element?.getAttribute("aria-label")?.trim();
    if (aria) return aria;
    const fromElement = readLabelFromElement(reactElement);
    if (fromElement) return fromElement;
    return fallback;
}

export function readLabelFromElement(element: ReactElement | null): string | null {
    if (!element) return null;

    const props = (element.props ?? {}) as Record<string, unknown>;

    const tooltip = typeof props.tooltip === "string" ? (props.tooltip as string).trim() : "";
    if (tooltip) return tooltip;

    const aria = typeof props.ariaLabel === "string" ? (props.ariaLabel as string).trim() : "";
    if (aria) return aria;

    const children = props.children as ReactNode | undefined;
    return readLabelFromChildren(children);
}

export function readLabelFromChildren(children: ReactNode | undefined): string | null {
    if (children == null || typeof children === "boolean") return null;
    if (typeof children === "string") return children.trim() || null;
    if (typeof children === "number") return children.toString();
    if (Array.isArray(children)) {
        for (const child of children) {
            const label = readLabelFromChildren(child);
            if (label) return label;
        }
        return null;
    }
    if (React.isValidElement(children)) {
        return readLabelFromElement(children);
    }
    return null;
}

export function ensureChatBarCommandState(buttonKey: string, label: string): ChatBarCommandState {
    const normalizedLabel = label.trim() || buttonKey;
    const existing = chatBarCommandStates.get(buttonKey);
    if (existing) {
        if (existing.label !== normalizedLabel) {
            existing.label = normalizedLabel;
            registerCommand(buildChatBarCommand(existing));
        }
        return existing;
    }

    const commandId = createUniqueChatBarCommandId(normalizedLabel, buttonKey);
    const state: ChatBarCommandState = {
        commandId,
        label: normalizedLabel,
        getters: new Set()
    };

    chatBarCommandStates.set(buttonKey, state);
    chatBarCommandStatesById.set(commandId, state);
    registerCommand(buildChatBarCommand(state));
    return state;
}

function createUniqueChatBarCommandId(label: string, buttonKey: string): string {
    const baseSlug = slugifyActionLabel(label) || slugifyActionLabel(buttonKey) || "chat-button";
    let candidate = `chatbar-${baseSlug}`;
    let suffix = 2;
    while (registry.has(candidate) || chatBarCommandStatesById.has(candidate)) {
        candidate = `chatbar-${baseSlug}-${suffix++}`;
    }
    return candidate;
}

function buildChatBarCommand(state: ChatBarCommandState): CommandEntry {
    const keywords = Array.from(new Set([
        ...state.label.toLowerCase().split(/\s+/).filter(Boolean),
        "chat",
        "button"
    ]));

    return {
        id: state.commandId,
        label: state.label,
        keywords,
        categoryId: CHATBAR_ACTIONS_CATEGORY_ID,
        tags: [TAG_PLUGINS, TAG_UTILITY],
        handler: () => activateChatBarCommand(state)
    } satisfies CommandEntry;
}

export function activateChatBarCommand(state: ChatBarCommandState) {
    const element = resolveChatBarElement(state);
    if (!element) {
        showToast(`Unable to find the "${state.label}" chat button.`, Toasts.Type.FAILURE);
        return;
    }

    try {
        element.click();
    } catch (error) {
        console.error("CommandPalette", "Failed to click chat bar button", state.label, error);
        showToast(`Failed to trigger ${state.label}.`, Toasts.Type.FAILURE);
        return;
    }

    showToast(`${state.label} activated.`, Toasts.Type.SUCCESS);
}

export function resolveChatBarElement(state: ChatBarCommandState): HTMLElement | null {
    for (const getter of Array.from(state.getters)) {
        try {
            const candidate = getter();
            if (candidate && candidate.isConnected) return candidate;
        } catch (error) {
            console.error("CommandPalette", "Failed to resolve chat bar button", error);
        }
    }
    return document.querySelector<HTMLElement>(`[${CHATBAR_DATA_ATTRIBUTE}="${state.commandId}"]`);
}

function incrementTagMetadata(tagId: string, label: string) {
    if (!tagId) return;
    const existing = tagMetadata.get(tagId);
    if (existing) {
        existing.count += 1;
        return;
    }
    tagMetadata.set(tagId, {
        label,
        count: 1
    });
}

function decrementTagMetadata(tagId: string) {
    const existing = tagMetadata.get(tagId);
    if (!existing) return;
    existing.count -= 1;
    if (existing.count <= 0) {
        tagMetadata.delete(tagId);
    }
}

function extractChannelId(input: unknown): string | null {
    if (typeof input === "string") return input;
    if (!input || typeof input !== "object") return null;
    const candidate = input as Record<string, unknown>;
    if (typeof candidate.id === "string") return candidate.id;
    if (typeof candidate.channelId === "string") return candidate.channelId;
    if (typeof candidate.channel_id === "string") return candidate.channel_id;
    if (candidate.channel) return extractChannelId(candidate.channel);
    return null;
}

function extractUserId(input: unknown): string | null {
    if (!input) return null;

    if (typeof input === "string") {
        const id = input;
        return UserStore?.getUser?.(id) ? id : null;
    }

    if (Array.isArray(input)) {
        for (const value of input) {
            const nested = extractUserId(value);
            if (nested) return nested;
        }
        return null;
    }

    if (typeof input !== "object") return null;

    const candidate = input as Record<string, unknown>;
    const directFields: Array<keyof typeof candidate> = [
        "userId",
        "user_id",
        "recipientId",
        "recipient_id"
    ];

    for (const field of directFields) {
        const value = candidate[field];
        if (typeof value === "string" && UserStore?.getUser?.(value)) {
            return value;
        }
    }

    const recipientArrays: Array<keyof typeof candidate> = ["recipient_ids", "recipients", "rawRecipients"];
    for (const key of recipientArrays) {
        const value = candidate[key];
        if (!Array.isArray(value)) continue;
        for (const entry of value) {
            const id = extractUserId(entry);
            if (id) return id;
        }
    }

    if (candidate.user) {
        const nested = extractUserId(candidate.user);
        if (nested) return nested;
    }

    if (candidate.channel) {
        const nested = extractUserId(candidate.channel);
        if (nested) return nested;
    }

    return null;
}

function findUserIdInArgs(args: unknown[]): string | null {
    for (const arg of args) {
        const id = extractUserId(arg);
        if (id) return id;
    }
    return null;
}

function resolveChannelFromPayload(input: unknown): any | null {
    if (!input) return null;

    if (typeof input === "object") {
        const candidate = input as Record<string, unknown>;
        if (candidate && typeof candidate.id === "string" && ("type" in candidate || "isDM" in candidate)) {
            return candidate;
        }
        if (candidate.channel) {
            const nested = resolveChannelFromPayload(candidate.channel);
            if (nested) return nested;
        }
        if (typeof candidate.channel_id === "string") {
            const fallback: Record<string, unknown> = { id: candidate.channel_id };
            if (candidate.recipients) fallback.recipients = candidate.recipients;
            if (candidate.rawRecipients) fallback.rawRecipients = candidate.rawRecipients;
            if (candidate.type) fallback.type = candidate.type;
            return fallback;
        }
    }

    const channelId = extractChannelId(input);
    if (!channelId) return null;
    return ChannelStore.getChannel(channelId) ?? { id: channelId };
}

function deriveDmRecipient(channel: any): string | undefined {
    if (!channel) return undefined;
    const currentUserId = UserStore?.getCurrentUser?.()?.id;
    try {
        if (typeof channel.getRecipientId === "function") {
            const id = channel.getRecipientId();
            if (id && id !== currentUserId) return id;
        }
    } catch {
        /* noop */
    }

    if (Array.isArray(channel.recipients)) {
        for (const value of channel.recipients) {
            if (typeof value === "string" && value !== currentUserId) return value;
        }
    }

    if (Array.isArray(channel.rawRecipients)) {
        for (const entry of channel.rawRecipients) {
            const id = typeof entry === "string"
                ? entry
                : entry && typeof entry === "object" && typeof (entry as { id?: string; }).id === "string"
                    ? (entry as { id: string; }).id
                    : undefined;
            if (id && id !== currentUserId) return id;
        }
    }

    return undefined;
}

function trackClosedChannel(channel: any) {
    if (!channel || typeof channel.id !== "string") return;

    try {
        const isDm = typeof channel.isDM === "function" ? channel.isDM() : channel.type === 1;
        const isGroupDm = typeof channel.isGroupDM === "function" ? channel.isGroupDM() : channel.type === 3;
        if (!isDm && !isGroupDm) return;

        lastClosedDm = {
            channelId: channel.id,
            recipientId: isDm ? deriveDmRecipient(channel) : undefined,
            isGroupDm
        };
    } catch {
        /* noop */
    }
}

function trackClosedRecipient(recipientId: string | null | undefined, fallbackChannelId?: string | null) {
    if (!recipientId) return;

    const currentUserId = UserStore?.getCurrentUser?.()?.id;
    if (currentUserId && recipientId === currentUserId) return;

    if (lastClosedDm?.isGroupDm) return;

    let dmChannelId: string | null = null;
    const getDmFromUserId = (ChannelStore as { getDMFromUserId?: (id: string) => string | null; }).getDMFromUserId;
    if (typeof getDmFromUserId === "function") {
        try {
            dmChannelId = getDmFromUserId(recipientId) ?? null;
        } catch (error) {
            console.error("CommandPalette", "Failed to resolve DM channel", error);
        }
    }

    lastClosedDm = {
        channelId: fallbackChannelId ?? dmChannelId ?? null,
        recipientId,
        isGroupDm: false
    };
}

function patchChannelCloseMethods() {
    if (channelClosePatched) return;

    const actions = ChannelActionCreators as Record<string, unknown> | undefined;
    if (!actions) return;

    const methodNames = [
        "closePrivateChannel",
        "closeChannel",
        "deletePrivateChannel",
        "closeDM"
    ];

    const restorers: Array<() => void> = [];

    for (const name of methodNames) {
        const original = actions[name];
        if (typeof original !== "function") continue;

        const patched = function patchedChannelClose(this: unknown, ...args: any[]) {
            try {
                const channel = resolveChannelFromPayload(args[0]);
                trackClosedChannel(channel);

                const snapshot = lastClosedDm;
                if (!snapshot || !snapshot.recipientId) {
                    const userId = findUserIdInArgs(args);
                    if (userId) {
                        const fallbackChannelId = snapshot?.channelId ?? (typeof channel?.id === "string" ? channel.id : null);
                        trackClosedRecipient(userId, fallbackChannelId);
                    }
                }
            } catch (error) {
                console.error("CommandPalette", `Failed to record closed channel via ${name}`, error);
            }
            return (original as (...inner: any[]) => unknown).apply(this, args);
        };

        (actions as Record<string, unknown>)[name] = patched;
        restorers.push(() => {
            (actions as Record<string, unknown>)[name] = original;
        });
    }

    if (!restorers.length) return;

    channelClosePatched = true;
    sessionCleanupCallbacks.push(() => {
        for (const restore of restorers) {
            try {
                restore();
            } catch (error) {
                console.error("CommandPalette", "Failed to restore channel close method", error);
            }
        }
        channelClosePatched = false;
    });
}

let statusResetTimeout: number | null = null;
let statusResetPrevious: string | null = null;
let sessionHooksInitialized = false;
let lastClosedDm: ClosedDmSnapshot | null = null;
let channelClosePatched = false;
const sessionCleanupCallbacks: Array<() => void> = [];
const runtimeCleanupCallbacks: Array<() => void> = [];

const NotificationSettingsActionCreators = findByPropsLazy("updateGuildNotificationSettings", "updateChannelOverrideSettings");
const GuildSettingsActions = findByPropsLazy("open", "selectRole", "updateGuild");
const UserGuildSettingsStore = findStoreLazy("UserGuildSettingsStore");

export const DEFAULT_CATEGORY_ID = "quick-actions";

const CATEGORY_WEIGHTS = new Map<string, number>([
    [DEFAULT_CATEGORY_ID, 100],
    [CONTEXT_PROVIDER_ID, 95],
    [SESSION_TOOLS_CATEGORY_ID, 90],
    ["discord-settings", 90],
    ["updates", 75],
    [CUSTOM_COMMANDS_CATEGORY_ID, 80],
    ["plugins", 45],
    ["plugins-enable", 45],
    ["plugins-disable", 45],
    ["plugins-settings", 40],
    ["plugins-changes", 40],
    [TOOLBOX_ACTIONS_CATEGORY_ID, 45],
    [CHATBAR_ACTIONS_CATEGORY_ID, 45],
    [GUILD_CATEGORY_ID, 40],
    [FRIENDS_CATEGORY_ID, 40]
]);

const CATEGORY_GROUP_LABELS = new Map<string | undefined, string>([
    [DEFAULT_CATEGORY_ID, "Core Actions"],
    [CONTEXT_PROVIDER_ID, "Core Actions"],
    [SESSION_TOOLS_CATEGORY_ID, "Core Actions"],
    ["discord-settings", "Discord Settings"],
    ["updates", "Updates"],
    [CUSTOM_COMMANDS_CATEGORY_ID, "Custom Commands"],
    ["plugins", "Plugin Controls"],
    ["plugins-enable", "Plugin Controls"],
    ["plugins-disable", "Plugin Controls"],
    ["plugins-settings", "Plugin Controls"],
    ["plugins-changes", "Plugin Controls"],
    [TOOLBOX_ACTIONS_CATEGORY_ID, "Plugin Controls"],
    [CHATBAR_ACTIONS_CATEGORY_ID, "Plugin Controls"],
    [GUILD_CATEGORY_ID, "Guilds"],
    [FRIENDS_CATEGORY_ID, "Friends"]
]);

const DEFAULT_CATEGORY_WEIGHT = 50;

const CATEGORY_DEFAULT_TAGS = new Map<string, string[]>([
    [DEFAULT_CATEGORY_ID, [TAG_CORE]],
    [CONTEXT_PROVIDER_ID, [TAG_CONTEXT]],
    [SESSION_TOOLS_CATEGORY_ID, [TAG_SESSION]],
    ["discord-settings", [TAG_NAVIGATION]],
    ["updates", [TAG_DEVELOPER]],
    [CUSTOM_COMMANDS_CATEGORY_ID, [TAG_CUSTOM]],
    ["plugins", [TAG_PLUGINS]],
    ["plugins-enable", [TAG_PLUGINS]],
    ["plugins-disable", [TAG_PLUGINS]],
    ["plugins-settings", [TAG_PLUGINS]],
    ["plugins-changes", [TAG_PLUGINS]],
    [TOOLBOX_ACTIONS_CATEGORY_ID, [TAG_PLUGINS, TAG_UTILITY]],
    [CHATBAR_ACTIONS_CATEGORY_ID, [TAG_PLUGINS, TAG_UTILITY]],
    [GUILD_CATEGORY_ID, [TAG_GUILDS]],
    [FRIENDS_CATEGORY_ID, [TAG_FRIENDS]]
]);

const PINNED_STORAGE_KEY = "CommandPalettePinned";
const pinnedCommandIds = new Set<string>();
const pinListeners = new Set<(pins: Set<string>) => void>();

interface ContextCommandProvider {
    id: string;
    getCommands(): CommandEntry[];
    subscribe?(refresh: () => void): () => void;
}

interface ContextProviderRecord {
    provider: ContextCommandProvider;
    commandIds: Set<string>;
    unsubscribe?: () => void;
}

const contextProviders = new Map<string, ContextProviderRecord>();
let pluginToggleSettingsUnsubscribe: (() => void) | null = null;

type CustomCommandAction =
    | { type: "command"; commandId: string; }
    | { type: "settings"; route: string; }
    | { type: "url"; url: string; openExternal?: boolean; }
    | { type: "macro"; steps: string[]; };

export interface CustomCommandDefinition {
    id: string;
    label: string;
    description?: string;
    keywords?: string[];
    tags?: string[];
    categoryId?: string;
    danger?: boolean;
    action: CustomCommandAction;
}

let customCommands: CustomCommandDefinition[] = [];
const customCommandListeners = new Set<(commands: CustomCommandDefinition[]) => void>();

const customCommandsReady = (async () => {
    try {
        const stored = await DataStore.get<CustomCommandDefinition[]>(CUSTOM_COMMANDS_KEY);
        if (Array.isArray(stored)) {
            setCustomCommands(stored);
        }
    } catch (error) {
        console.error("CommandPalette", "Failed to load custom commands", error);
    }
})();

function generateCustomId(existing: Set<string>) {
    let id: string;
    do {
        id = `custom-${Math.random().toString(36).slice(2, 8)}`;
    } while (existing.has(id));
    return id;
}

function sanitizeCustomCommands(input: CustomCommandDefinition[] | undefined | null): CustomCommandDefinition[] {
    if (!Array.isArray(input)) return [];
    const seen = new Set<string>();
    const result: CustomCommandDefinition[] = [];

    for (const entry of input) {
        if (!entry || typeof entry !== "object") continue;
        const normalizedAction = (() => {
            const action = entry.action as CustomCommandAction | undefined;
            if (!action || typeof action !== "object" || typeof action.type !== "string") return null;
            switch (action.type) {
                case "command":
                    return { type: "command", commandId: String(action.commandId ?? "") } as CustomCommandAction;
                case "settings":
                    return { type: "settings", route: String(action.route ?? "") } as CustomCommandAction;
                case "url":
                    return { type: "url", url: String(action.url ?? ""), openExternal: Boolean(action.openExternal) } as CustomCommandAction;
                case "macro":
                    if (!Array.isArray((action as any).steps)) return { type: "macro", steps: [] } as CustomCommandAction;
                    return {
                        type: "macro",
                        steps: (action as any).steps.map((step: unknown) => String(step)).filter(Boolean)
                    } as CustomCommandAction;
                default:
                    return null;
            }
        })();

        if (!normalizedAction) continue;

        const keywords = Array.isArray(entry.keywords)
            ? entry.keywords.map(keyword => String(keyword).trim()).filter(Boolean)
            : [];

        const tags: string[] = [];
        if (Array.isArray(entry.tags)) {
            const seenTags = new Set<string>();
            for (const rawTag of entry.tags) {
                const trimmedTag = String(rawTag ?? "").trim();
                if (!trimmedTag) continue;
                const tagSlug = normalizeTag(trimmedTag);
                if (!tagSlug || seenTags.has(tagSlug)) continue;
                seenTags.add(tagSlug);
                tags.push(trimmedTag);
            }
        }

        let id = typeof entry.id === "string" && entry.id.trim().length ? entry.id.trim() : "";
        if (!id || seen.has(id)) {
            id = generateCustomId(seen);
        }

        const label = typeof entry.label === "string" ? entry.label.trim() : "";

        const normalized: CustomCommandDefinition = {
            id,
            label,
            description: entry.description ? String(entry.description) : undefined,
            keywords,
            tags,
            categoryId: entry.categoryId ? String(entry.categoryId) : undefined,
            danger: Boolean(entry.danger),
            action: normalizedAction
        };

        seen.add(id);
        result.push(normalized);
    }

    return result;
}

function emitCustomCommands() {
    const snapshot = customCommands.map(command => ({
        ...command,
        keywords: command.keywords ? [...command.keywords] : undefined,
        tags: command.tags ? [...command.tags] : undefined
    }));
    for (const listener of customCommandListeners) listener(snapshot);
}

function setCustomCommands(commands: CustomCommandDefinition[]) {
    customCommands = sanitizeCustomCommands(commands);
    emitCustomCommands();
    refreshContextProvider(CUSTOM_PROVIDER_ID);
}

export function getCustomCommandsSnapshot(): CustomCommandDefinition[] {
    return customCommands.map(command => ({
        ...command,
        keywords: command.keywords ? [...command.keywords] : undefined,
        tags: command.tags ? [...command.tags] : undefined
    }));
}

export function subscribeCustomCommands(listener: (commands: CustomCommandDefinition[]) => void) {
    customCommandListeners.add(listener);
    listener(getCustomCommandsSnapshot());
    return () => {
        customCommandListeners.delete(listener);
    };
}

export async function saveCustomCommands(commands: CustomCommandDefinition[]) {
    setCustomCommands(commands);
    try {
        await DataStore.set(CUSTOM_COMMANDS_KEY, customCommands);
    } catch (error) {
        console.error("CommandPalette", "Failed to persist custom commands", error);
    }
}

function getStatusLabel(status: string) {
    switch (status) {
        case "online":
            return "Online";
        case "idle":
            return "Idle";
        case "dnd":
            return "Do Not Disturb";
        case "invisible":
            return "Invisible";
        default:
            return status;
    }
}

function clearScheduledStatusReset(showToastMessage = true) {
    if (statusResetTimeout != null) {
        clearTimeout(statusResetTimeout);
        statusResetTimeout = null;
        if (showToastMessage) {
            showToast("Canceled scheduled status reset.", Toasts.Type.MESSAGE);
        }
    }
    statusResetPrevious = null;
}

function scheduleStatusReset(durationMinutes: number) {
    if (!StatusSetting) {
        showToast("Unable to change status right now.", Toasts.Type.FAILURE);
        return;
    }

    const previous = StatusSetting.getSetting?.() ?? "online";
    clearScheduledStatusReset(false);
    StatusSetting.updateSetting("dnd");
    statusResetPrevious = previous;

    statusResetTimeout = window.setTimeout(() => {
        const target = statusResetPrevious ?? "online";
        StatusSetting.updateSetting(target);
        showToast(`Status reverted to ${getStatusLabel(target)}.`, Toasts.Type.SUCCESS);
        statusResetTimeout = null;
        statusResetPrevious = null;
    }, durationMinutes * 60_000);

    showToast(`Do Not Disturb for ${durationMinutes} minutes.`, Toasts.Type.SUCCESS);
}

function ensureSessionHooks() {
    if (sessionHooksInitialized) return;
    sessionHooksInitialized = true;

    patchChannelCloseMethods();

    const handleChannelClose = (payload: any) => {
        const channel = resolveChannelFromPayload(payload);
        if (channel) trackClosedChannel(channel);

        const snapshot = lastClosedDm;
        if (!snapshot || !snapshot.recipientId) {
            const userId = extractUserId(payload);
            if (userId) {
                const fallbackChannelId = snapshot?.channelId ?? (typeof channel?.id === "string" ? channel.id : null);
                trackClosedRecipient(userId, fallbackChannelId);
            }
        }
    };

    FluxDispatcher.subscribe?.("CHANNEL_CLOSE", handleChannelClose);

    sessionCleanupCallbacks.push(() => {
        FluxDispatcher.unsubscribe?.("CHANNEL_CLOSE", handleChannelClose);
        sessionHooksInitialized = false;
        lastClosedDm = null;
    });
}

export function cleanupCommandPaletteRuntime() {
    clearScheduledStatusReset(false);
    while (sessionCleanupCallbacks.length) {
        const callback = sessionCleanupCallbacks.pop();
        try {
            callback?.();
        } catch (error) {
            console.error("CommandPalette", "Failed to cleanup session callback", error);
        }
    }
    while (runtimeCleanupCallbacks.length) {
        const callback = runtimeCleanupCallbacks.pop();
        try {
            callback?.();
        } catch (error) {
            console.error("CommandPalette", "Failed to cleanup runtime callback", error);
        }
    }
    for (const record of contextProviders.values()) {
        try {
            record.unsubscribe?.();
        } catch (error) {
            console.error("CommandPalette", "Failed to unsubscribe context provider", record.provider.id, error);
        }
        record.unsubscribe = undefined;
        record.commandIds.clear();
    }
    lastClosedDm = null;
    contextProviders.clear();
    categories.clear();
    registry.clear();
    cachedSortedCommands = null;
    categoryCommandCache.clear();
    treeCommandCache.clear();
    searchTextCache.clear();
    commandTagIds.clear();
    tagMetadata.clear();
    recentCommandIds.length = 0;
    builtInsRegistered = false;
    registryVersion += 1;
    emitRegistryVersion();
    registryListeners.clear();
}

export function getCategoryWeight(categoryId?: string): number {
    if (!categoryId) return DEFAULT_CATEGORY_WEIGHT;
    return CATEGORY_WEIGHTS.get(categoryId) ?? DEFAULT_CATEGORY_WEIGHT;
}

export function getCategoryGroupLabel(categoryId?: string): string {
    return CATEGORY_GROUP_LABELS.get(categoryId) ?? "Other";
}

export function getRecentRank(commandId: string): number {
    return recentCommandIds.indexOf(commandId);
}

function refreshContextProvider(id: string) {
    const record = contextProviders.get(id);
    if (!record) return;

    const { commandIds } = record;
    const previousIds = Array.from(commandIds);
    const preservedPins = new Set<string>();

    if (previousIds.length) {
        for (const commandId of previousIds) {
            const preservePin = pinnedCommandIds.has(commandId);
            if (preservePin) preservedPins.add(commandId);
            removeCommand(commandId, preservePin ? { preservePin: true } : undefined);
            commandIds.delete(commandId);
        }
    }

    let commands: CommandEntry[] = [];
    try {
        commands = record.provider.getCommands() ?? [];
    } catch (error) {
        console.error("CommandPalette", "Failed to compute commands for provider", record.provider.id, error);
        commands = [];
    }

    const nextIds = new Set<string>();

    for (const entry of commands) {
        registerCommand(entry);
        commandIds.add(entry.id);
        nextIds.add(entry.id);
    }

    if (preservedPins.size) {
        let changed = false;
        for (const commandId of preservedPins) {
            if (!nextIds.has(commandId) && pinnedCommandIds.delete(commandId)) {
                changed = true;
            }
        }
        if (changed) emitPinned();
    }
}

function scheduleProviderRegistration(record: ContextProviderRecord) {
    if (!record.provider.subscribe) return;
    const refresh = () => refreshContextProvider(record.provider.id);
    const unsubscribe = record.provider.subscribe(refresh);
    record.unsubscribe = unsubscribe;
}

function registerContextProvider(provider: ContextCommandProvider) {
    if (contextProviders.has(provider.id)) return;

    const record: ContextProviderRecord = {
        provider,
        commandIds: new Set<string>()
    };

    contextProviders.set(provider.id, record);
    scheduleProviderRegistration(record);
    refreshContextProvider(provider.id);
}

export function refreshAllContextProviders() {
    for (const id of contextProviders.keys()) {
        refreshContextProvider(id);
    }
}

type RemoveCommandOptions = {
    preservePin?: boolean;
};

function removeCommand(commandId: string, options?: RemoveCommandOptions) {
    const existing = registry.get(commandId);
    if (!existing) return;

    const wasPinned = pinnedCommandIds.has(commandId);

    registry.delete(commandId);

    if (wasPinned && !options?.preservePin) {
        pinnedCommandIds.delete(commandId);
        emitPinned();
    }

    searchTextCache.delete(commandId);

    const tagIds = commandTagIds.get(commandId);
    if (tagIds) {
        for (const tagId of tagIds) {
            decrementTagMetadata(tagId);
        }
        commandTagIds.delete(commandId);
    }

    bumpRegistryVersion();
}

export function getCommandById(commandId: string): CommandEntry | undefined {
    return registry.get(commandId);
}

const pinsReady = (async () => {
    try {
        const stored = await DataStore.get<string[]>(PINNED_STORAGE_KEY);
        if (Array.isArray(stored)) {
            for (const id of stored) pinnedCommandIds.add(id);
        }
    } catch (error) {
        console.error("CommandPalette", "Failed to load pinned commands", error);
    }
})();

function invalidateCaches() {
    cachedSortedCommands = null;
    categoryCommandCache.clear();
    treeCommandCache.clear();
}

function emitRegistryVersion() {
    for (const listener of registryListeners) listener(registryVersion);
}

function bumpRegistryVersion() {
    registryVersion += 1;
    invalidateCaches();
    emitRegistryVersion();
}

function computeSearchText(entry: CommandEntry) {
    const keywords = entry.keywords ?? [];
    const tags = entry.tags ?? [];
    return [entry.label, entry.description ?? "", entry.shortcut ?? "", ...keywords, ...tags]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
}

function recordRecent(commandId: string) {
    const index = recentCommandIds.indexOf(commandId);
    if (index !== -1) recentCommandIds.splice(index, 1);
    recentCommandIds.unshift(commandId);
    if (recentCommandIds.length > RECENT_COMMAND_LIMIT) {
        recentCommandIds.length = RECENT_COMMAND_LIMIT;
    }
}

export function getRecentCommands(): CommandEntry[] {
    const results: CommandEntry[] = [];
    for (const id of recentCommandIds) {
        const entry = registry.get(id);
        if (entry) results.push(entry);
    }
    return results;
}

function getNewestRecentCommand(excludeId?: string): CommandEntry | undefined {
    for (const id of recentCommandIds) {
        if (id === excludeId || RECENT_COMMAND_SKIP_IDS.has(id)) continue;
        const entry = registry.get(id);
        if (entry) return entry;
    }
    return undefined;
}

function emitPinned() {
    const snapshot = new Set(pinnedCommandIds);
    for (const listener of pinListeners) listener(snapshot);
}

async function persistPinned() {
    try {
        await DataStore.set(PINNED_STORAGE_KEY, Array.from(pinnedCommandIds));
    } catch (error) {
        console.error("CommandPalette", "Failed to save pinned commands", error);
    }
}

function prunePinned() {
    let changed = false;
    for (const id of Array.from(pinnedCommandIds)) {
        if (!registry.has(id)) {
            pinnedCommandIds.delete(id);
            changed = true;
        }
    }
    return changed;
}

pinsReady.then(() => emitPinned());

const BUILT_IN_CATEGORIES: CommandCategory[] = [
    {
        id: DEFAULT_CATEGORY_ID,
        label: "Quick Actions",
        description: "Common Equicord shortcuts"
    },
    {
        id: "plugins",
        label: "Plugins",
        description: "Manage Equicord and Vencord plugins"
    },
    {
        id: CONTEXT_PROVIDER_ID,
        label: "Current Context",
        description: "Actions for the selected channel and guild"
    },
    {
        id: "plugins-enable",
        label: "Enable Plugin",
        parentId: "plugins"
    },
    {
        id: "plugins-disable",
        label: "Disable Plugin",
        parentId: "plugins"
    },
    {
        id: "plugins-settings",
        label: "Plugin Settings",
        parentId: "plugins"
    },
    {
        id: TOOLBOX_ACTIONS_CATEGORY_ID,
        label: "Plugin Actions",
        parentId: "plugins"
    },
    {
        id: CHATBAR_ACTIONS_CATEGORY_ID,
        label: "Chat Bar Buttons",
        parentId: "plugins"
    },
    {
        id: "plugins-changes",
        label: "Plugin Changes",
        parentId: "plugins"
    },
    {
        id: "updates",
        label: "Updates",
        description: "Stay up to date with Equicord"
    },
    {
        id: "discord-settings",
        label: "Discord Settings",
        description: "Jump to Discord configuration pages"
    },
    {
        id: CUSTOM_COMMANDS_CATEGORY_ID,
        label: "Custom Commands",
        description: "User-defined command palette entries"
    },
    {
        id: SESSION_TOOLS_CATEGORY_ID,
        label: "Session Tools",
        description: "Utilities for managing your Discord session"
    },
    {
        id: GUILD_CATEGORY_ID,
        label: "Guilds",
        description: "Quickly navigate to your guilds"
    },
    {
        id: FRIENDS_CATEGORY_ID,
        label: "Friends",
        description: "Quickly DM your friends"
    }
];

const BUILT_IN_COMMANDS: CommandEntry[] = [
    {
        id: "open-equicord-settings",
        label: "Open Equicord Settings",
        keywords: ["settings", "equicord"],
        categoryId: DEFAULT_CATEGORY_ID,
        tags: [TAG_NAVIGATION, TAG_CORE],
        handler: () => openUserSettingsPanel("equicord_main")
    },
    {
        id: "open-plugin-settings",
        label: "Open Plugin Settings",
        keywords: ["settings", "plugins"],
        categoryId: DEFAULT_CATEGORY_ID,
        tags: [TAG_NAVIGATION, TAG_PLUGINS],
        handler: () => openUserSettingsPanel("equicord_plugins")
    },
    {
        id: "reload-windows",
        label: "Reload Discord",
        description: "Reloads the current Discord window",
        keywords: ["reload"],
        categoryId: DEFAULT_CATEGORY_ID,
        tags: [TAG_DEVELOPER, TAG_UTILITY],
        handler: () => window.location.reload()
    }
];

const DISCORD_SETTINGS_COMMANDS: Array<{ id: string; label: string; route: string; keywords: string[]; description?: string; }> = [
    { id: "settings-account", label: "Open My Account", route: "my_account", keywords: ["account", "profile"] },
    { id: "settings-privacy", label: "Open Data & Privacy", route: "data_and_privacy", keywords: ["privacy", "safety", "data"] },
    { id: "settings-notifications", label: "Open Notifications", route: "legacy_notifications_settings", keywords: ["notifications"] },
    { id: "settings-voice", label: "Open Voice & Video", route: "voice_and_video", keywords: ["voice", "video", "audio"] },
    { id: "settings-text", label: "Open Text & Images", route: "text_and_images", keywords: ["text", "images"] },
    { id: "settings-appearance", label: "Open Appearance", route: "appearance", keywords: ["appearance", "theme"] },
    { id: "settings-accessibility", label: "Open Accessibility", route: "accessibility", keywords: ["accessibility"] },
    { id: "settings-keybinds", label: "Open Keybinds", route: "keybinds", keywords: ["keybinds", "shortcuts"] },
    { id: "settings-advanced", label: "Open Advanced", route: "advanced", keywords: ["advanced"] }
];

const settingsCommandsById = new Map<string, typeof DISCORD_SETTINGS_COMMANDS[number]>();
const settingsCommandsByRoute = new Map<string, typeof DISCORD_SETTINGS_COMMANDS[number]>();

let builtInsRegistered = false;

export function registerCategory(category: CommandCategory) {
    const parentId = category.parentId ?? null;
    const normalized = { ...category, parentId } satisfies CommandCategory;
    const existing = categories.get(category.id);

    if (
        existing &&
        existing.label === normalized.label &&
        existing.description === normalized.description &&
        (existing.parentId ?? null) === parentId
    ) {
        return;
    }

    categories.set(category.id, normalized);
    bumpRegistryVersion();
}

export function listCategories(): CommandCategory[] {
    return Array.from(categories.values()).sort((a, b) => a.label.localeCompare(b.label));
}

export function listChildCategories(parentId: string | null): CommandCategory[] {
    const normalized = parentId ?? null;
    return listCategories().filter(cat => (cat.parentId ?? null) === normalized);
}

export function getCategoryPath(categoryId?: string): CommandCategory[] {
    if (!categoryId) return [];

    const path: CommandCategory[] = [];
    let current: CommandCategory | undefined = categories.get(categoryId);

    while (current) {
        path.unshift(current);
        current = current.parentId ? categories.get(current.parentId) : undefined;
    }

    return path;
}

export function registerCommand(entry: CommandEntry) {
    const preservePin = pinnedCommandIds.has(entry.id);
    if (registry.has(entry.id)) {
        removeCommand(entry.id, preservePin ? { preservePin: true } : undefined);
    }

    const categoryId = entry.categoryId ?? DEFAULT_CATEGORY_ID;

    if (!categories.has(categoryId)) {
        registerCategory({
            id: categoryId,
            label: categoryId
                .split(/[\s-]+/)
                .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                .join(" "),
            parentId: null
        });
    }

    const labelByTagId = new Map<string, string>();

    const addTag = (rawTag: string | undefined | null) => {
        if (!rawTag) return;
        const normalizedTag = normalizeTag(rawTag);
        if (!normalizedTag) return;
        if (!labelByTagId.has(normalizedTag)) {
            labelByTagId.set(normalizedTag, rawTag.trim());
        }
    };

    if (Array.isArray(entry.tags)) {
        for (const tag of entry.tags) addTag(tag);
    }

    const defaultTags = CATEGORY_DEFAULT_TAGS.get(categoryId);
    if (defaultTags) {
        for (const tag of defaultTags) addTag(tag);
    }

    const normalizedTagIds = Array.from(labelByTagId.keys());
    const displayTags = Array.from(labelByTagId.values());

    const normalized: CommandEntry = {
        ...entry,
        categoryId,
        hiddenInSearch: entry.hiddenInSearch ?? false,
        searchGroup: entry.searchGroup,
        tags: displayTags
    };

    registry.set(entry.id, normalized);
    commandTagIds.set(entry.id, normalizedTagIds);
    for (const tagId of normalizedTagIds) {
        const label = labelByTagId.get(tagId) ?? tagId;
        incrementTagMetadata(tagId, label);
    }
    searchTextCache.set(entry.id, computeSearchText(normalized));
    bumpRegistryVersion();
}

export function listCommands(): CommandEntry[] {
    if (!cachedSortedCommands) {
        cachedSortedCommands = Array.from(registry.values()).sort((a, b) => a.label.localeCompare(b.label));
    }
    return cachedSortedCommands;
}

export function listCommandsByCategory(categoryId: string): CommandEntry[] {
    const cached = categoryCommandCache.get(categoryId);
    if (cached) return cached;

    const filtered = listCommands().filter(entry => entry.categoryId === categoryId);
    categoryCommandCache.set(categoryId, filtered);
    return filtered;
}

export function isCommandPinned(commandId: string): boolean {
    return pinnedCommandIds.has(commandId);
}

export async function togglePinned(commandId: string): Promise<boolean | null> {
    await pinsReady;
    if (!commandId) return null;

    if (!registry.has(commandId)) {
        refreshAllContextProviders();
    }

    if (!registry.has(commandId)) {
        console.warn("CommandPalette", "Attempted to pin unavailable command", commandId);
        return null;
    }

    const willPin = !pinnedCommandIds.has(commandId);
    if (willPin) {
        pinnedCommandIds.add(commandId);
    } else {
        pinnedCommandIds.delete(commandId);
    }

    await persistPinned();
    emitPinned();
    return willPin;
}

export function subscribePinned(listener: (pins: Set<string>) => void) {
    let active = true;
    const wrapped = (pins: Set<string>) => {
        if (!active) return;
        listener(new Set(pins));
    };

    pinListeners.add(wrapped);
    void pinsReady.then(() => wrapped(pinnedCommandIds));

    return () => {
        active = false;
        pinListeners.delete(wrapped);
    };
}

function collectCategoryTreeIds(rootId: string): Set<string> {
    const visited = new Set<string>();
    const queue: string[] = [rootId];

    while (queue.length) {
        const id = queue.shift()!;
        if (visited.has(id)) continue;
        visited.add(id);

        for (const category of categories.values()) {
            const parent = category.parentId ?? null;
            if (parent === id) {
                queue.push(category.id);
            }
        }
    }

    return visited;
}

export function listCommandsInTree(categoryId: string): CommandEntry[] {
    const cached = treeCommandCache.get(categoryId);
    if (cached) return cached;

    const categoryIds = collectCategoryTreeIds(categoryId);
    const filtered = listCommands().filter(entry => entry.categoryId && categoryIds.has(entry.categoryId));
    treeCommandCache.set(categoryId, filtered);
    return filtered;
}

export function getCommandSearchText(commandId: string): string {
    return searchTextCache.get(commandId) ?? "";
}

export function getRegistryVersion(): number {
    return registryVersion;
}

export function listAllTags(): CommandTagMeta[] {
    return Array.from(tagMetadata.entries())
        .map(([id, meta]) => ({ id, label: meta.label, count: meta.count }))
        .sort((a, b) => {
            if (b.count === a.count) return a.label.localeCompare(b.label);
            return b.count - a.count;
        });
}

export function getCommandTagIds(commandId: string): string[] {
    return commandTagIds.get(commandId) ?? [];
}

export function subscribeRegistry(listener: (version: number) => void) {
    let active = true;
    const wrapped = (version: number) => {
        if (!active) return;
        listener(version);
    };

    registryListeners.add(wrapped);
    wrapped(registryVersion);

    return () => {
        active = false;
        registryListeners.delete(wrapped);
    };
}

export async function executeCommand(entry: CommandEntry) {
    try {
        await entry.handler();
        recordRecent(entry.id);
    } catch (error) {
        Toasts.show({
            message: `Command failed: ${entry.label}`,
            type: Toasts.Type.FAILURE,
            id: Toasts.genId(),
        });
        console.error("CommandPalette", error);
    }
}

function showToast(message: string, type: ToastKind) {
    Toasts.show({
        message,
        type,
        id: Toasts.genId(),
        options: {
            position: Toasts.Position.BOTTOM
        }
    });
}

function createPluginKeywords(plugin: Plugin): string[] {
    const base = [plugin.name.toLowerCase(), "plugin"];
    if (plugin.description) {
        base.push(...plugin.description.toLowerCase().split(/\s+/));
    }
    return Array.from(new Set(base.filter(Boolean)));
}

function buildPluginToggleCommand(plugin: Plugin): CommandEntry {
    const enabled = isPluginEnabled(plugin.name);
    const keywords = Array.from(new Set([
        ...createPluginKeywords(plugin),
        "settings",
        "configure",
        "preferences"
    ]));

    return {
        id: `toggle-plugin-${plugin.name.toLowerCase()}`,
        label: `${enabled ? "Disable" : "Enable"} ${plugin.name}`,
        description: plugin.description,
        keywords,
        categoryId: enabled ? "plugins-disable" : "plugins-enable",
        searchGroup: `plugin-${plugin.name.toLowerCase()}`,
        tags: [TAG_PLUGINS, TAG_UTILITY],
        handler: async () => {
            const before = isPluginEnabled(plugin.name);
            const result = await toggleEnabled(plugin.name);
            const after = isPluginEnabled(plugin.name);

            if (result && before !== after) {
                showToast(`${after ? "Enabled" : "Disabled"} ${plugin.name}.`, Toasts.Type.SUCCESS);
            } else if (!result) {
                showToast(`Failed to toggle ${plugin.name}.`, Toasts.Type.FAILURE);
            }

            refreshPluginToggleCommand(plugin);
        }
    } satisfies CommandEntry;
}

function refreshPluginToggleCommand(plugin: Plugin) {
    registerCommand(buildPluginToggleCommand(plugin));
}

function registerPluginToggleCommands() {
    for (const plugin of Object.values(plugins)) {
        refreshPluginToggleCommand(plugin);
    }

    if (!pluginToggleSettingsUnsubscribe) {
        const listener = (_: unknown, path: string) => {
            if (typeof path !== "string" || !path.startsWith("plugins.")) return;
            if (!path.endsWith(".enabled")) return;
            const pluginName = path.slice("plugins.".length, -".enabled".length);
            const target = plugins[pluginName];
            if (!target) return;
            refreshPluginToggleCommand(target);
        };
        SettingsStore.addGlobalChangeListener(listener);
        pluginToggleSettingsUnsubscribe = () => {
            SettingsStore.removeGlobalChangeListener(listener);
        };
        runtimeCleanupCallbacks.push(() => {
            pluginToggleSettingsUnsubscribe?.();
            pluginToggleSettingsUnsubscribe = null;
        });
    }
}

function registerPluginSettingsCommands() {
    for (const plugin of Object.values(plugins)) {
        const keywords = createPluginKeywords(plugin);
        registerCommand({
            id: `settings-plugin-${plugin.name.toLowerCase()}`,
            label: `${plugin.name} Settings`,
            description: plugin.description,
            keywords,
            categoryId: "plugins-settings",
            handler: () => openPluginModal(plugin),
            tags: [TAG_PLUGINS, TAG_NAVIGATION],
            searchGroup: `plugin-${plugin.name.toLowerCase()}`
        });
    }
}

function registerUpdateCommands() {
    registerCommand({
        id: "check-for-updates",
        label: "Check for Updates",
        description: "Checks for Equicord updates",
        keywords: ["updates", "check", "updater"],
        categoryId: "updates",
        tags: [TAG_DEVELOPER, TAG_UTILITY],
        handler: async () => {
            try {
                const outdated = await checkForUpdates();
                if (outdated) {
                    const count = changes.length;
                    showToast(count === 1 ? "One update available." : `${count} updates available.`, Toasts.Type.SUCCESS);
                } else {
                    showToast("No updates found.", Toasts.Type.MESSAGE);
                }
            } catch (error) {
                showToast("Failed to check for updates.", Toasts.Type.FAILURE);
                console.error("CommandPalette", error);
            }
        }
    });

    registerCommand({
        id: "open-changelog",
        label: "View Changelog",
        description: "Opens the Equicord changelog",
        keywords: ["updates", "changelog"],
        categoryId: "updates",
        tags: [TAG_DEVELOPER, TAG_NAVIGATION],
        handler: () => openUserSettingsPanel("equicord_changelog")
    });
}

function registerDiscordSettingsCommands() {
    for (const command of DISCORD_SETTINGS_COMMANDS) {
        settingsCommandsById.set(command.id, command);
        settingsCommandsByRoute.set(command.route, command);
        if (command.id === "settings-privacy") {
            settingsCommandsByRoute.set("Privacy & Safety", command);
        }
        registerCommand({
            id: command.id,
            label: command.label,
            description: command.description,
            keywords: command.keywords,
            categoryId: "discord-settings",
            tags: [TAG_NAVIGATION],
            handler: async () => {
                const fallbackRoute = command.id === "settings-privacy" ? "privacy_and_safety" : null;

                try {
                    await openUserSettingsPanel(command.route);
                } catch (error) {
                    if (fallbackRoute) {
                        await openUserSettingsPanel(fallbackRoute);
                    } else {
                        console.error("CommandPalette", "Failed to open Discord settings", command.route, error);
                        showToast(`Unable to open ${command.label}.`, Toasts.Type.FAILURE);
                    }
                }
            }
        });
    }
}

export function getSettingsCommandMetaById(id: string) {
    return settingsCommandsById.get(id);
}

export function getSettingsCommandMetaByRoute(route: string) {
    return settingsCommandsByRoute.get(route);
}

function getActiveChannel() {
    const channelId = SelectedChannelStore?.getChannelId?.();
    if (!channelId) return null;
    return ChannelStore.getChannel(channelId) ?? null;
}

function getActiveGuildId(): string | null {
    const guildId = SelectedGuildStore?.getGuildId?.();
    return guildId ?? null;
}

function getChannelDisplayLabel(channel: any): string {
    if (!channel) return "Current Channel";
    try {
        if (typeof channel.isDM === "function" && channel.isDM()) return "Direct Message";
        if (typeof channel.isGroupDM === "function" && channel.isGroupDM()) return channel.name ?? "Group DM";
        if (channel.name) return `#${channel.name}`;
        if (channel.rawRecipients?.length) return "Direct Message";
    } catch { }
    return "Current Channel";
}

function getGuildDisplayLabel(guildId: string | null): string {
    if (!guildId) return "Current Guild";
    const guild = GuildStore.getGuild?.(guildId) ?? null;
    return guild?.name ?? "Current Guild";
}

function buildMuteConfig(durationMinutes?: number | null) {
    if (!durationMinutes || durationMinutes <= 0) return null;
    const end = new Date(Date.now() + durationMinutes * 60_000).toISOString();
    return {
        end_time: end,
        selected_time_window: durationMinutes
    };
}

function toggleChannelMuteState(channelId: string, guildId: string | null, mute: boolean, durationMinutes?: number) {
    const actions = NotificationSettingsActionCreators as any;
    if (!actions?.updateChannelOverrideSettings) {
        showToast("Channel mute controls unavailable.", Toasts.Type.FAILURE);
        return;
    }

    const payload: Record<string, unknown> = {
        muted: mute,
        mute_config: mute ? buildMuteConfig(durationMinutes) : null
    };

    try {
        actions.updateChannelOverrideSettings(guildId, channelId, payload);
        showToast(`${mute ? "Muted" : "Unmuted"} channel.`, Toasts.Type.SUCCESS);
    } catch (error) {
        console.error("CommandPalette", "Failed to toggle channel mute", error);
        showToast("Failed to update channel mute state.", Toasts.Type.FAILURE);
    }
}

function toggleGuildMuteState(guildId: string, mute: boolean, durationMinutes?: number) {
    const actions = NotificationSettingsActionCreators as any;
    if (!actions?.updateGuildNotificationSettings) {
        showToast("Guild mute controls unavailable.", Toasts.Type.FAILURE);
        return;
    }

    const payload: Record<string, unknown> = {
        muted: mute,
        mute_config: mute ? buildMuteConfig(durationMinutes) : null
    };

    try {
        actions.updateGuildNotificationSettings(guildId, payload);
        showToast(`${mute ? "Muted" : "Unmuted"} server.`, Toasts.Type.SUCCESS);
    } catch (error) {
        console.error("CommandPalette", "Failed to toggle guild mute", error);
        showToast("Failed to update server mute state.", Toasts.Type.FAILURE);
    }
}

function minutesUntilTomorrow(): number {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return Math.max(1, Math.ceil((tomorrow.getTime() - now.getTime()) / 60_000));
}

function openPinsForChannel(channelId: string) {
    let dispatched = false;

    if (ComponentDispatch?.dispatchToLastSubscribed) {
        const toggleEvents = ["TOGGLE_CHANNEL_PINS", "CHANNEL_TOGGLE_PINNED_MESSAGES"];
        for (const event of toggleEvents) {
            try {
                ComponentDispatch.dispatchToLastSubscribed(event, {
                    channelId,
                    open: true,
                    isOpen: true,
                    location: "commandPalette"
                });
                dispatched = true;
                break;
            } catch (error) {
                console.error("CommandPalette", `Failed to dispatch ${event} for pins`, error);
            }
        }
    }

    if (dispatched) return;

    try {
        FluxDispatcher.dispatch({ type: "CHANNEL_PINS_MODAL_OPEN", channelId });
    } catch (error) {
        console.error("CommandPalette", "Failed to open pins", error);
        showToast("Unable to open pins panel.", Toasts.Type.FAILURE);
    }
}

function registerContextualCommands() {
    registerContextProvider({
        id: CONTEXT_PROVIDER_ID,
        getCommands: () => createContextualCommands(),
        subscribe: refresh => {
            const handler = () => refresh();
            SelectedChannelStore?.addChangeListener?.(handler);
            SelectedGuildStore?.addChangeListener?.(handler);
            UserGuildSettingsStore?.addChangeListener?.(handler);
            return () => {
                SelectedChannelStore?.removeChangeListener?.(handler);
                SelectedGuildStore?.removeChangeListener?.(handler);
                UserGuildSettingsStore?.removeChangeListener?.(handler);
            };
        }
    });
}

function createContextualCommands(): CommandEntry[] {
    const commands: CommandEntry[] = [];
    const channel = getActiveChannel();
    const guildId = getActiveGuildId();
    const channelId = channel?.id as string | undefined;

    if (channel && channelId) {
        const channelLabel = getChannelDisplayLabel(channel);
        commands.push({
            id: "context-channel-mark-read",
            label: `Mark ${channelLabel} Read`,
            keywords: ["context", "mark", "read", channelLabel.replace(/#/g, "")],
            categoryId: CONTEXT_PROVIDER_ID,
            tags: [TAG_CONTEXT, TAG_UTILITY],
            handler: async () => {
                try {
                    const ackChannel = ReadStateUtils?.ackChannel;
                    if (!ackChannel) throw new Error("ackChannel unavailable");
                    const ackTarget = ChannelStore.getChannel(channelId) ?? channel;
                    if (!ackTarget) throw new Error("Channel not found");
                    await Promise.resolve(ackChannel(ackTarget));
                    showToast(`Marked ${channelLabel} as read.`, Toasts.Type.SUCCESS);
                } catch (error) {
                    console.error("CommandPalette", "Failed to mark read", error);
                    showToast("Failed to mark channel as read.", Toasts.Type.FAILURE);
                }
            }
        });

        commands.push({
            id: "context-channel-open-pins",
            label: `Open Pins for ${channelLabel}`,
            keywords: ["context", "pins", channelLabel.replace(/#/g, "")],
            categoryId: CONTEXT_PROVIDER_ID,
            tags: [TAG_CONTEXT, TAG_NAVIGATION],
            handler: () => openPinsForChannel(channelId)
        });

        if (channel.guild_id && UserGuildSettingsStore?.isChannelMuted) {
            const isMuted = UserGuildSettingsStore.isChannelMuted(channel.guild_id, channelId);
            commands.push({
                id: "context-channel-toggle-mute",
                label: `${isMuted ? "Unmute" : "Mute"} ${channelLabel}`,
                keywords: ["context", "mute", channelLabel.replace(/#/g, "")],
                categoryId: CONTEXT_PROVIDER_ID,
                tags: [TAG_CONTEXT, TAG_UTILITY],
                handler: () => toggleChannelMuteState(channelId, channel.guild_id, !isMuted)
            });
        }
    }

    if (guildId && guildId !== "@me" && UserGuildSettingsStore?.isMuted) {
        const guildLabel = getGuildDisplayLabel(guildId);
        const isGuildMuted = UserGuildSettingsStore.isMuted(guildId);

        commands.push({
            id: "context-guild-toggle-mute",
            label: `${isGuildMuted ? "Unmute" : "Mute"} ${guildLabel}`,
            keywords: ["context", "guild", "mute"],
            categoryId: CONTEXT_PROVIDER_ID,
            tags: [TAG_CONTEXT, TAG_UTILITY],
            handler: () => toggleGuildMuteState(guildId, !isGuildMuted)
        });

        if (!isGuildMuted) {
            commands.push({
                id: "context-guild-mute-hour",
                label: `Mute ${guildLabel} for 1 Hour`,
                keywords: ["context", "guild", "mute", "hour"],
                categoryId: CONTEXT_PROVIDER_ID,
                tags: [TAG_CONTEXT, TAG_UTILITY],
                handler: () => toggleGuildMuteState(guildId, true, 60)
            });

            commands.push({
                id: "context-guild-mute-tomorrow",
                label: `Mute ${guildLabel} Until Tomorrow`,
                keywords: ["context", "guild", "mute", "tomorrow"],
                categoryId: CONTEXT_PROVIDER_ID,
                tags: [TAG_CONTEXT, TAG_UTILITY],
                handler: () => toggleGuildMuteState(guildId, true, minutesUntilTomorrow())
            });
        }

        if (GuildSettingsActions?.open) {
            commands.push({
                id: "context-guild-open-settings",
                label: `Open Settings for ${guildLabel}`,
                keywords: ["context", "guild", "settings"],
                categoryId: CONTEXT_PROVIDER_ID,
                tags: [TAG_CONTEXT, TAG_NAVIGATION],
                handler: async () => {
                    try {
                        await Promise.resolve(GuildSettingsActions.open(guildId, "OVERVIEW"));
                    } catch (error) {
                        console.error("CommandPalette", "Failed to open guild settings", error);
                        showToast("Unable to open guild settings.", Toasts.Type.FAILURE);
                    }
                }
            });
        }
    }

    return commands;
}

async function runCommandById(commandId: string, visited: Set<string>) {
    if (!commandId) return;
    if (visited.has(commandId)) {
        showToast("Command loop detected in macro execution.", Toasts.Type.FAILURE);
        return;
    }

    if (commandId.startsWith("custom-")) {
        visited.add(commandId);
    }

    const entry = getCommandById(commandId);
    if (!entry) {
        showToast(`Command ${commandId} not found.`, Toasts.Type.FAILURE);
        return;
    }

    await executeCommand(entry);
}

async function runMacroSteps(steps: string[], visited: Set<string>) {
    for (const step of steps) {
        await runCommandById(step, visited);
    }
}

async function executeCustomCommand(command: CustomCommandDefinition) {
    const { action } = command;
    try {
        switch (action.type) {
            case "command":
                await runCommandById(action.commandId, new Set([command.id]));
                break;
            case "settings":
                openUserSettingsPanel(action.route);
                break;
            case "url": {
                const external = (window as any)?.DiscordNative?.app?.openExternalURL;
                if (action.openExternal && typeof external === "function") {
                    external(action.url);
                } else {
                    window.open(action.url, "_blank", "noopener,noreferrer");
                }
                break;
            }
            case "macro":
                await runMacroSteps(action.steps, new Set([command.id]));
                break;
            default:
                showToast("Unsupported custom command action.", Toasts.Type.FAILURE);
                break;
        }
    } catch (error) {
        console.error("CommandPalette", "Failed to execute custom command", command, error);
        showToast(`Failed to run ${command.label}.`, Toasts.Type.FAILURE);
    }
}

function createCustomCommandEntries(): CommandEntry[] {
    return customCommands.map(command => ({
        id: command.id,
        label: command.label || "Untitled Command",
        description: command.description,
        keywords: command.keywords,
        tags: command.tags,
        categoryId: command.categoryId ?? CUSTOM_COMMANDS_CATEGORY_ID,
        danger: command.danger,
        handler: () => executeCustomCommand(command)
    }));
}

function registerCustomCommandProvider() {
    registerContextProvider({
        id: CUSTOM_PROVIDER_ID,
        getCommands: () => createCustomCommandEntries(),
        subscribe: refresh => subscribeCustomCommands(() => refresh())
    });
}

function clearDesktopNotifications() {
    const api = (window as any)?.DiscordNative?.notifications;
    if (api?.clearAll) {
        try {
            api.clearAll();
            showToast("Cleared desktop notifications.", Toasts.Type.SUCCESS);
        } catch (error) {
            console.error("CommandPalette", "Failed to clear notifications", error);
            showToast("Failed to clear notifications.", Toasts.Type.FAILURE);
        }
    } else {
        showToast("Notification clearing not supported.", Toasts.Type.FAILURE);
    }
}

function waitForDmChannel(userId: string, timeoutMs = 2000): Promise<string | null> {
    return new Promise(resolve => {
        const existing = ChannelStore.getDMFromUserId?.(userId) ?? null;
        if (existing) {
            resolve(existing);
            return;
        }

        const addListener = ChannelStore.addChangeListener?.bind(ChannelStore);
        const removeListener = ChannelStore.removeChangeListener?.bind(ChannelStore);

        if (typeof addListener !== "function" || typeof removeListener !== "function") {
            const timeoutId = window.setTimeout(() => {
                resolve(ChannelStore.getDMFromUserId?.(userId) ?? null);
            }, timeoutMs);
            sessionCleanupCallbacks.push(() => window.clearTimeout(timeoutId));
            return;
        }

        let settled = false;
        let timeoutId: number | null = null;

        const finish = (channelId: string | null) => {
            if (settled) return;
            settled = true;
            if (timeoutId !== null) {
                window.clearTimeout(timeoutId);
                timeoutId = null;
            }
            removeListener(listener);
            resolve(channelId);
        };

        const listener = () => {
            const channelId = ChannelStore.getDMFromUserId?.(userId) ?? null;
            if (channelId) {
                finish(channelId);
            }
        };

        addListener(listener);
        timeoutId = window.setTimeout(() => {
            finish(ChannelStore.getDMFromUserId?.(userId) ?? null);
        }, timeoutMs);

        sessionCleanupCallbacks.push(() => {
            if (!settled) {
                settled = true;
                if (timeoutId !== null) {
                    window.clearTimeout(timeoutId);
                    timeoutId = null;
                }
                removeListener(listener);
                resolve(ChannelStore.getDMFromUserId?.(userId) ?? null);
            }
        });
    });
}

async function reopenLastClosedDm() {
    ensureSessionHooks();
    const snapshot = lastClosedDm;
    if (!snapshot) {
        showToast("No DM closures recorded this session.", Toasts.Type.MESSAGE);
        return;
    }

    const { channelId, recipientId, isGroupDm } = snapshot;
    const fallbackChannelId = typeof channelId === "string" ? channelId : null;

    const navigate = (targetId: string | null | undefined): boolean => {
        if (!targetId) return false;
        ChannelRouter.transitionToChannel(targetId);
        showToast("Reopened last closed DM.", Toasts.Type.SUCCESS);
        return true;
    };

    try {
        if (fallbackChannelId) {
            const existingChannel = ChannelStore.getChannel(fallbackChannelId);
            if (existingChannel && navigate(fallbackChannelId)) {
                return;
            }
        }

        if (!isGroupDm && recipientId && ChannelActionCreators?.openPrivateChannel) {
            const immediateId = ChannelStore.getDMFromUserId?.(recipientId) ?? null;
            if (navigate(immediateId)) {
                return;
            }

            let reopenedId: string | null | undefined = null;
            try {
                const result = await Promise.resolve(ChannelActionCreators.openPrivateChannel({
                    recipientIds: [recipientId],
                    location: "CommandPalette",
                    navigateToChannel: false
                }));
                if (typeof result === "string") {
                    reopenedId = result;
                }
            } catch (error) {
                console.error("CommandPalette", "Failed to open DM via ChannelActionCreators", error);
            }

            if (!reopenedId) {
                reopenedId = await waitForDmChannel(recipientId, 2000);
            }

            if (navigate(reopenedId)) {
                return;
            }

            const fallback = ChannelStore.getDMFromUserId?.(recipientId) ?? fallbackChannelId;
            if (navigate(fallback)) {
                return;
            }

            showToast("The DM could not be reopened.", Toasts.Type.FAILURE);
            return;
        }

        if (navigate(fallbackChannelId)) {
            return;
        }

        showToast("The DM is no longer available.", Toasts.Type.FAILURE);
    } catch (error) {
        console.error("CommandPalette", "Failed to reopen DM", error);
        showToast("The DM is no longer available.", Toasts.Type.FAILURE);
    } finally {
        lastClosedDm = null;
    }
}

function registerSessionCommands() {
    ensureSessionHooks();

    const commands: CommandEntry[] = [
        {
            id: "session-dnd-30",
            label: "Set DND for 30 Minutes",
            keywords: ["session", "status", "dnd", "30"],
            categoryId: SESSION_TOOLS_CATEGORY_ID,
            tags: [TAG_SESSION, TAG_UTILITY],
            handler: () => scheduleStatusReset(30)
        },
        {
            id: "session-dnd-60",
            label: "Set DND for 1 Hour",
            keywords: ["session", "status", "dnd", "60"],
            categoryId: SESSION_TOOLS_CATEGORY_ID,
            tags: [TAG_SESSION, TAG_UTILITY],
            handler: () => scheduleStatusReset(60)
        },
        {
            id: "session-status-cancel",
            label: "Cancel Status Timer",
            keywords: ["session", "status", "cancel"],
            categoryId: SESSION_TOOLS_CATEGORY_ID,
            tags: [TAG_SESSION, TAG_UTILITY],
            handler: () => clearScheduledStatusReset()
        },
        {
            id: "session-clear-notifications",
            label: "Clear Desktop Notifications",
            keywords: ["session", "notifications", "clear"],
            categoryId: SESSION_TOOLS_CATEGORY_ID,
            tags: [TAG_SESSION, TAG_UTILITY],
            handler: clearDesktopNotifications
        },
        {
            id: "session-reopen-dm",
            label: "Reopen Last Closed DM",
            keywords: ["session", "dm", "reopen"],
            categoryId: SESSION_TOOLS_CATEGORY_ID,
            tags: [TAG_SESSION, TAG_NAVIGATION],
            handler: reopenLastClosedDm
        }
    ];

    for (const command of commands) {
        registerCommand(command);
    }
}

function registerGuildCommands() {
    const guilds = GuildStore.getGuilds?.() ?? {};

    Object.values(guilds).forEach((guild: Guild) => {
        registerCommand({
            id: `open-guild-${guild.id}`,
            label: `Navigate to ${guild.name}`,
            keywords: ["guild", "server", guild.name.toLowerCase()],
            categoryId: GUILD_CATEGORY_ID,
            tags: [TAG_GUILDS, TAG_NAVIGATION],
            handler: () => {
                NavigationRouter.transitionToGuild(guild.id);
            }
        } satisfies CommandEntry);
    });
}

function registerFriendCommands() {
    const friendIds = RelationshipStore.getFriendIDs();

    friendIds.forEach((userId: string) => {
        const user = UserStore.getUser(userId);
        if (!user) return;

        const displayName = RelationshipStore.getNickname(userId) || user.globalName || null;

        const username = displayName
            ? `${displayName} (@${user.username})`
            : user.username;

        registerCommand({
            id: `open-friend-${user.id}`,
            label: `Open DM with ${username}`,
            keywords: ["friend", "dm", username.toLowerCase()],
            categoryId: FRIENDS_CATEGORY_ID,
            tags: [TAG_FRIENDS, TAG_NAVIGATION],
            handler: () => {
                const channelId = ChannelStore.getDMFromUserId(user.id);
                NavigationRouter.transitionTo(`/channels/@me/${channelId}`);
            }
        } satisfies CommandEntry);
    });
}

function setPresenceStatus(status: "online" | "idle" | "dnd" | "invisible") {
    if (!StatusSetting) {
        showToast("Unable to change status right now.", Toasts.Type.FAILURE);
        return;
    }

    StatusSetting.updateSetting(status);
    const label = {
        online: "Online",
        idle: "Idle",
        dnd: "Do Not Disturb",
        invisible: "Invisible"
    }[status];

    showToast(`Status set to ${label}.`, Toasts.Type.SUCCESS);
}

function toggleStreamerMode() {
    const { enabled } = StreamerModeStore;
    FluxDispatcher.dispatch({
        type: "STREAMER_MODE_UPDATE",
        key: "enabled",
        value: !enabled
    });
    showToast(`Streamer Mode ${!enabled ? "enabled" : "disabled"}.`, Toasts.Type.SUCCESS);
}

function toggleSelfMute() {
    VoiceActions.toggleSelfMute();
    const muted = MediaEngineStore.isSelfMute();
    showToast(muted ? "Microphone muted." : "Microphone unmuted.", Toasts.Type.SUCCESS);
}

function toggleSelfDeaf() {
    VoiceActions.toggleSelfDeaf();
    const deaf = MediaEngineStore.isSelfDeaf();
    showToast(deaf ? "You are now deafened." : "You are no longer deafened.", Toasts.Type.SUCCESS);
}

function toggleQuickCss() {
    Settings.useQuickCss = !Settings.useQuickCss;
    showToast(`QuickCSS ${Settings.useQuickCss ? "enabled" : "disabled"}.`, Toasts.Type.SUCCESS);
}

function toggleWindowTransparency() {
    Settings.transparent = !Settings.transparent;
    showToast(`Window transparency ${Settings.transparent ? "enabled" : "disabled"}.`, Toasts.Type.SUCCESS);
}

function registerCommandPaletteUtilities() {
    registerCommand({
        id: "command-palette-open-settings",
        label: "Open Command Palette Settings",
        description: "Configure the Command Palette plugin",
        keywords: ["command", "palette", "settings"],
        categoryId: DEFAULT_CATEGORY_ID,
        tags: [TAG_NAVIGATION, TAG_DEVELOPER],
        handler: () => {
            openPluginModal(commandPalette);
        }
    });

    registerCommand({
        id: "command-palette-show-recent",
        label: "Show Recent Commands",
        description: "Displays the last executed commands",
        keywords: ["recent", "history"],
        categoryId: DEFAULT_CATEGORY_ID,
        tags: [TAG_CORE],
        handler: () => {
            const recents = getRecentCommands().slice(0, 5);
            if (recents.length === 0) {
                showToast("No commands have been run yet.", Toasts.Type.MESSAGE);
                return;
            }

            const message = recents
                .map((entry, index) => `${index + 1}. ${entry.label}`)
                .join("\n");

            Toasts.show({
                message,
                type: Toasts.Type.MESSAGE,
                id: Toasts.genId(),
                options: { position: Toasts.Position.BOTTOM }
            });
        }
    });

    registerCommand({
        id: "command-palette-rerun-last",
        label: "Re-run Last Command",
        keywords: ["recent", "again"],
        categoryId: DEFAULT_CATEGORY_ID,
        tags: [TAG_CORE, TAG_UTILITY],
        handler: async () => {
            const last = getNewestRecentCommand("command-palette-rerun-last");
            if (!last) {
                showToast("No commands available to re-run.", Toasts.Type.MESSAGE);
                return;
            }
            await executeCommand(last);
        }
    });

    registerCommand({
        id: "command-palette-toggle-pin-last",
        label: "Toggle Pin on Last Command",
        keywords: ["recent", "pin"],
        categoryId: DEFAULT_CATEGORY_ID,
        tags: [TAG_CORE, TAG_UTILITY],
        handler: async () => {
            const last = getNewestRecentCommand("command-palette-toggle-pin-last");
            if (!last) {
                showToast("No recent commands to pin.", Toasts.Type.MESSAGE);
                return;
            }
            const result = await togglePinned(last.id);
            if (result === null) {
                showToast(`${last.label} is not currently available to pin.`, Toasts.Type.MESSAGE);
                return;
            }
            showToast(`${last.label} ${result ? "pinned" : "unpinned"}.`, Toasts.Type.SUCCESS);
        }
    });
}

function registerSystemUtilityCommands() {
    const commands: Array<{ id: string; label: string; description?: string; handler: () => void; keywords: string[]; tags: string[]; }> = [
        {
            id: "set-status-online",
            label: "Set Status: Online",
            handler: () => setPresenceStatus("online"),
            keywords: ["status", "online"],
            tags: [TAG_CORE, TAG_UTILITY]
        },
        {
            id: "set-status-idle",
            label: "Set Status: Idle",
            handler: () => setPresenceStatus("idle"),
            keywords: ["status", "idle"],
            tags: [TAG_CORE, TAG_UTILITY]
        },
        {
            id: "set-status-dnd",
            label: "Set Status: Do Not Disturb",
            handler: () => setPresenceStatus("dnd"),
            keywords: ["status", "dnd", "busy"],
            tags: [TAG_CORE, TAG_UTILITY]
        },
        {
            id: "set-status-invisible",
            label: "Set Status: Invisible",
            handler: () => setPresenceStatus("invisible"),
            keywords: ["status", "offline", "invisible"],
            tags: [TAG_CORE, TAG_UTILITY]
        },
        {
            id: "toggle-streamer-mode",
            label: "Toggle Streamer Mode",
            handler: toggleStreamerMode,
            keywords: ["stream", "privacy"],
            tags: [TAG_UTILITY]
        },
        {
            id: "toggle-self-mute",
            label: "Toggle Self Mute",
            handler: toggleSelfMute,
            keywords: ["voice", "mute"],
            tags: [TAG_UTILITY]
        },
        {
            id: "toggle-self-deafen",
            label: "Toggle Self Deafen",
            handler: toggleSelfDeaf,
            keywords: ["voice", "deafen"],
            tags: [TAG_UTILITY]
        }
    ];

    for (const entry of commands) {
        registerCommand({
            id: entry.id,
            label: entry.label,
            description: entry.description,
            keywords: entry.keywords,
            categoryId: DEFAULT_CATEGORY_ID,
            tags: entry.tags,
            handler: entry.handler
        });
    }
}

function hotReloadPlugin(plugin: Plugin) {
    if (!isPluginEnabled(plugin.name)) {
        showToast(`${plugin.name} is disabled.`, Toasts.Type.MESSAGE);
        return false;
    }

    if (plugin.patches?.length) {
        showToast(`${plugin.name} requires a restart to reload.`, Toasts.Type.MESSAGE);
        return false;
    }

    const stopped = stopPlugin(plugin);
    if (!stopped) {
        showToast(`Failed to stop ${plugin.name}.`, Toasts.Type.FAILURE);
        return false;
    }

    const started = startPlugin(plugin);
    if (!started) {
        showToast(`Failed to restart ${plugin.name}.`, Toasts.Type.FAILURE);
        return false;
    }

    showToast(`Reloaded ${plugin.name}.`, Toasts.Type.SUCCESS);
    return true;
}

async function reloadAllPlugins() {
    const entries = Object.values(plugins);
    let count = 0;
    for (const plugin of entries) {
        if (!isPluginEnabled(plugin.name)) continue;
        if (hotReloadPlugin(plugin)) count += 1;
    }

    if (count === 0) {
        showToast("No plugins were reloaded.", Toasts.Type.MESSAGE);
    } else {
        showToast(`Reloaded ${count} plugin${count === 1 ? "" : "s"}.`, Toasts.Type.SUCCESS);
    }
}

async function setAllPluginsEnabled(enabled: boolean) {
    let changed = 0;
    for (const plugin of Object.values(plugins) as Plugin[]) {
        const currentlyEnabled = isPluginEnabled(plugin.name);
        if (enabled && currentlyEnabled) continue;
        if (!enabled) {
            if (isPluginEnabled(plugin.name)) continue;
            if (!currentlyEnabled) continue;
        }
        if (plugin.patches?.length) continue;

        const result = await toggleEnabled(plugin.name);
        if (result) {
            const nowEnabled = isPluginEnabled(plugin.name);
            if (nowEnabled === enabled) changed += 1;
        }
    }

    showToast(changed ? `${enabled ? "Enabled" : "Disabled"} ${changed} plugin${changed === 1 ? "" : "s"}.` : "No plugins changed state.", Toasts.Type.SUCCESS);
}

function registerPluginChangeCommands() {
    registerCommand({
        id: "reload-all-plugins",
        label: "Reload All Plugins",
        description: "Attempts to hot reload every enabled plugin",
        keywords: ["plugin", "reload", "restart"],
        categoryId: "plugins-changes",
        tags: [TAG_PLUGINS, TAG_DEVELOPER, TAG_UTILITY],
        handler: () => void reloadAllPlugins()
    });

    registerCommand({
        id: "enable-all-plugins",
        label: "Enable All Plugins",
        keywords: ["plugin", "enable"],
        categoryId: "plugins-changes",
        tags: [TAG_PLUGINS, TAG_UTILITY],
        handler: () => void setAllPluginsEnabled(true)
    });

    registerCommand({
        id: "disable-all-plugins",
        label: "Disable All Non-required Plugins",
        keywords: ["plugin", "disable"],
        categoryId: "plugins-changes",
        tags: [TAG_PLUGINS, TAG_UTILITY],
        handler: () => void setAllPluginsEnabled(false)
    });

    registerCommand({
        id: "restart-equicord",
        label: "Restart Equicord",
        description: "Reloads the Discord client window",
        keywords: ["restart", "reload"],
        categoryId: "plugins-changes",
        tags: [TAG_DEVELOPER, TAG_UTILITY],
        handler: () => window.location.reload()
    });
}

function slugifyActionLabel(label: string) {
    return label
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function createPluginToolboxCommands(): CommandEntry[] {
    const pluginMap = plugins as Record<string, Plugin>;
    const entries: CommandEntry[] = [];
    const usedIds = new Set<string>();

    for (const plugin of Object.values(pluginMap)) {
        const { toolboxActions } = plugin;
        const actionEntries = Object.entries(toolboxActions ?? {});
        if (actionEntries.length === 0) continue;

        for (const [actionLabel, action] of actionEntries) {
            if (typeof action !== "function") continue;
            const normalizedLabel = actionLabel?.trim() || "Action";
            const baseSlug = slugifyActionLabel(normalizedLabel) || "action";
            const baseId = `plugin-action-${plugin.name.toLowerCase()}-${baseSlug}`;
            let uniqueId = baseId;
            let counter = 2;
            while (usedIds.has(uniqueId) || registry.has(uniqueId)) {
                uniqueId = `${baseId}-${counter++}`;
            }
            usedIds.add(uniqueId);

            const enabled = isPluginEnabled(plugin.name);

            const keywords = Array.from(new Set([
                ...createPluginKeywords(plugin),
                ...normalizedLabel.toLowerCase().split(/\s+/),
                ...(enabled ? [] : ["disabled"])
            ]));

            entries.push({
                id: uniqueId,
                label: `${plugin.name}: ${normalizedLabel}`,
                description: plugin.description,
                keywords,
                categoryId: TOOLBOX_ACTIONS_CATEGORY_ID,
                tags: [TAG_PLUGINS, TAG_UTILITY, TAG_DEVELOPER],
                handler: () => {
                    if (!isPluginEnabled(plugin.name)) {
                        showToast(`${plugin.name} is disabled. Enable the plugin to use this action.`, Toasts.Type.FAILURE);
                        return;
                    }
                    return runPluginToolboxAction(plugin, action, normalizedLabel);
                }
            });
        }
    }

    return entries;
}

async function runPluginToolboxAction(plugin: Plugin, action: () => void | Promise<void>, actionLabel: string) {
    try {
        await Promise.resolve(action.call(plugin));
    } catch (error) {
        console.error("CommandPalette", "Toolbox action failed", plugin.name, actionLabel, error);
        showToast(`Failed to run ${plugin.name}: ${actionLabel}`, Toasts.Type.FAILURE);
    }
}

function registerPluginToolboxProvider() {
    registerContextProvider({
        id: TOOLBOX_ACTIONS_PROVIDER_ID,
        getCommands: () => createPluginToolboxCommands(),
        subscribe: refresh => {
            const handler = (_: unknown, path: string) => {
                if (typeof path !== "string" || !path.startsWith("plugins.")) return;
                refresh();
            };
            SettingsStore.addGlobalChangeListener(handler);
            return () => {
                SettingsStore.removeGlobalChangeListener(handler);
            };
        }
    });
}

function registerCustomizationCommands() {
    registerCommand({
        id: "toggle-quickcss",
        label: "Toggle QuickCSS",
        keywords: ["css", "theme", "quick"],
        categoryId: DEFAULT_CATEGORY_ID,
        tags: [TAG_CUSTOMIZATION, TAG_UTILITY],
        handler: toggleQuickCss
    });

    registerCommand({
        id: "toggle-window-transparency",
        label: "Toggle Window Transparency",
        keywords: ["window", "transparency", "appearance"],
        categoryId: DEFAULT_CATEGORY_ID,
        tags: [TAG_CUSTOMIZATION, TAG_UTILITY],
        handler: toggleWindowTransparency
    });

    registerCommand({
        id: "open-theme-library",
        label: "Open Theme Library",
        keywords: ["theme", "library"],
        categoryId: DEFAULT_CATEGORY_ID,
        tags: [TAG_CUSTOMIZATION, TAG_NAVIGATION],
        handler: () => openUserSettingsPanel("equicord_themes")
    });
}

export function registerBuiltInCommands() {
    if (builtInsRegistered) return;

    for (const category of BUILT_IN_CATEGORIES) {
        registerCategory(category);
    }

    for (const entry of BUILT_IN_COMMANDS) {
        registerCommand(entry);
    }

    registerCommandPaletteUtilities();
    registerSystemUtilityCommands();
    registerUpdateCommands();
    registerDiscordSettingsCommands();
    registerPluginToggleCommands();
    registerPluginSettingsCommands();
    registerPluginChangeCommands();
    registerPluginToolboxProvider();
    registerCustomizationCommands();
    registerContextualCommands();
    registerCustomCommandProvider();
    registerSessionCommands();
    registerGuildCommands();
    registerFriendCommands();

    void pinsReady.then(async () => {
        if (prunePinned()) {
            await persistPinned();
        }
        emitPinned();
    });

    builtInsRegistered = true;
}
