/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { isPluginEnabled, plugins, startPlugin, stopPlugin } from "@api/PluginManager";
import { Settings, SettingsStore } from "@api/Settings";
import { getUserSettingLazy } from "@api/UserSettings";
import { openPluginModal } from "@components/settings/tabs";
import { toggleEnabled } from "@equicordplugins/equicordHelper/utils";
import { copyWithToast } from "@utils/discord";
import { Logger } from "@utils/Logger";
import type { Plugin } from "@utils/types";
import { changes, checkForUpdates } from "@utils/updater";
import { Guild } from "@vencord/discord-types";
import { findByPropsLazy, findExportedComponentLazy, findStoreLazy } from "@webpack";
import { Alerts, ChannelActionCreators, ChannelRouter, ChannelStore, ComponentDispatch, FluxDispatcher, GuildStore, IconUtils, MediaEngineStore, MessageStore, NavigationRouter, React, ReadStateStore, ReadStateUtils, SelectedChannelStore, SelectedGuildStore, SettingsRouter, StreamerModeStore, Toasts, useEffect, UserStore, VoiceActions } from "@webpack/common";
import type { FC, ReactElement, ReactNode } from "react";

import commandPalette from ".";
import {
    resolveActionByActionKey,
    resolveActionIntentByActionKey,
    type ResolvedActionByKey
} from "./actions/actionRouting";
import {
    type CustomCommandIconId,
    getCustomCommandIconById,
    isCustomCommandIconId,
    resolveCustomCommandDefaultIconId
} from "./customCommandIcons";
import {
    createExtensionsState,
    EXTENSIONS_CATALOG_CATEGORY_ID,
    registerExtensionProviders
} from "./extensions";
import {
    BUILT_IN_CATEGORIES,
    CATEGORY_DEFAULT_TAGS,
    CATEGORY_GROUP_LABELS,
    CATEGORY_WEIGHTS,
    CHATBAR_ACTIONS_CATEGORY_ID,
    CONTEXT_PROVIDER_ID,
    CUSTOM_COMMANDS_CATEGORY_ID,
    CUSTOM_PROVIDER_ID,
    DEFAULT_CATEGORY_ID,
    DEFAULT_CATEGORY_WEIGHT,
    GUILD_CATEGORY_ID,
    MENTION_PROVIDER_ID,
    MENTIONS_CATEGORY_ID,
    PINNED_CATEGORY_ID,
    PLUGIN_MANAGER_DISABLE_COMMAND_ID,
    PLUGIN_MANAGER_ENABLE_COMMAND_ID,
    PLUGIN_MANAGER_ROOT_COMMAND_ID,
    PLUGIN_MANAGER_SETTINGS_COMMAND_ID,
    RECENTS_CATEGORY_ID,
    SESSION_TOOLS_CATEGORY_ID,
    TOOLBOX_ACTIONS_CATEGORY_ID,
    TOOLBOX_ACTIONS_PROVIDER_ID
} from "./metadata/categories";
import {
    normalizeTag,
    TAG_CONTEXT,
    TAG_CORE,
    TAG_CUSTOMIZATION,
    TAG_DEVELOPER,
    TAG_GUILDS,
    TAG_NAVIGATION,
    TAG_PLUGINS,
    TAG_SESSION,
    TAG_UTILITY
} from "./metadata/tags";
import { createPinsStore } from "./runtime/pins";
import { createRecentsStore } from "./runtime/recents";
import { createRegistryStore } from "./runtime/registryStore";
import { makeIconFromUrl } from "./ui/iconFromUrl";
import { createCommandPageCommand } from "./ui/pages/createCommandPageCommand";
import type { PalettePageRef } from "./ui/pages/types";

export { DEFAULT_CATEGORY_ID, normalizeTag, PINNED_CATEGORY_ID };
export { normalizeActionKey } from "./actions/actionRouting";

type CommandHandler = () => void | Promise<void>;

type ToastKind = (typeof Toasts.Type)[keyof typeof Toasts.Type];

export type CommandActionIntent =
    | { type: "execute-primary"; }
    | { type: "execute-secondary"; actionKey: string; }
    | { type: "toggle-pin"; commandId: string; }
    | { type: "open-page"; page: PalettePageRef; }
    | { type: "open-drilldown"; categoryId: string; }
    | { type: "submit-active-page"; }
    | { type: "go-back"; }
    | { type: "toggle-calculator-view"; mode: "result" | "graph"; }
    | { type: "copy-calculator"; mode: "formatted" | "raw" | "qa"; };

export interface CommandActionContext {
    command: CommandEntry;
    drilldownCategoryId: string | null;
    isPageOpen: boolean;
    hasCalculatorResult: boolean;
    canGoBack: boolean;
}

export interface CommandActionDefinition {
    id: string;
    label: string;
    shortcut: string;
    icon?: React.ComponentType<{ className?: string; size?: string; }>;
    intent: CommandActionIntent;
    handler?: CommandHandler;
    isVisible?(ctx: CommandActionContext): boolean;
    isEnabled?(ctx: CommandActionContext): boolean;
}

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
    icon?: React.ComponentType<{ className?: string; size?: string; }>;
    drilldownCategoryId?: string;
    page?: PalettePageRef;
    queryTemplate?: string;
    queryPlaceholder?: string;
    closeAfterExecute?: boolean;
    actions?(ctx: CommandActionContext): CommandActionDefinition[];
}

export interface ExtensionDefinition {
    id: string;
    label: string;
    description: string;
    detailCategoryId: string;
    commandId: string;
    commandLabel: string;
    commandDescription: string;
    sourcePath?: string;
    readmePath?: string;
    tags?: string[];
    keywords?: string[];
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

interface NotificationsInboxStoreLike {
    getInboxMessages?: () => unknown[] | null;
    getNotifyingChannelIds?: () => string[] | null;
}

interface RecentMentionsStoreLike {
    getMentions?: () => unknown[] | null;
    getSettingsFilteredMentions?: () => unknown[] | null;
}

interface MentionEntry {
    key: string;
    messageId?: string;
    channelId?: string;
    guildId?: string;
    authorId?: string;
    content?: string;
    timestamp?: number;
}

interface ReadStateStoreLike {
    getMentionCount?: (channelId: string) => number;
    getUnreadCount?: (channelId: string) => number;
    getMentionChannelIds?: () => string[];
    hasUnreadOrMentions?: (channelId: string) => boolean;
    getReadStatesByChannel?: () => Record<string, unknown>;
}

interface DiscordNativeLike {
    app?: {
        openExternalURL?: (url: string) => void;
    };
    window?: {
        openDevTools?: () => void;
        toggleDevTools?: () => void;
    };
    notifications?: {
        clearAll?: () => void;
    };
}

interface ChannelLike {
    id: string;
    type?: number;
    name?: string;
    recipients?: string[];
    rawRecipients?: Array<string | { id?: string; }>;
    isDM?: () => boolean;
    isGroupDM?: () => boolean;
    getRecipientId?: () => string | null | undefined;
}

interface WindowWithDiscordNative extends Window {
    DiscordNative?: DiscordNativeLike;
}

interface ChannelStoreAccessorMixins {
    getDMFromUserId?: (id: string) => string | null;
    getSortedPrivateChannels?: () => Array<string | { id?: string; channelId?: string; }>;
}

export const chatBarCommandStates = new Map<string, ChatBarCommandState>();
export const chatBarCommandStatesById = new Map<string, ChatBarCommandState>();
const CHATBAR_DATASET_KEY = "vcCommandPaletteId";
const CHATBAR_DATA_ATTRIBUTE = "data-vc-command-palette-id";

const categories = new Map<string, CommandCategory>();
const registry = new Map<string, CommandEntry>();

const StatusSetting = getUserSettingLazy<string>("status", "status");
const COMMAND_PALETTE_PLUGIN_NAME = "CommandPalette";
const logger = new Logger(COMMAND_PALETTE_PLUGIN_NAME);
const CUSTOM_COMMANDS_KEY = "CommandPaletteCustomCommands";

const commandTagIds = new Map<string, string[]>();
const tagMetadata = new Map<string, { label: string; count: number; }>();

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
            <ChatBarCommandBridge key={existingKey ?? buttonKey} {...bridgeProps} />
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
        return null;
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
        hiddenInSearch: true,
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
    } catch {
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
        } catch {
            continue;
        }
    }
    return null;
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

function resolveChannelFromPayload(input: unknown): ChannelLike | null {
    if (!input) return null;

    if (typeof input === "object") {
        const candidate = input as Record<string, unknown>;
        if (candidate && typeof candidate.id === "string" && ("type" in candidate || "isDM" in candidate)) {
            const resolved = candidate as { id: string; type?: unknown; name?: unknown; recipients?: unknown; rawRecipients?: unknown; isDM?: unknown; isGroupDM?: unknown; getRecipientId?: unknown; };
            return {
                id: resolved.id,
                type: typeof resolved.type === "number" ? resolved.type : undefined,
                name: typeof resolved.name === "string" ? resolved.name : undefined,
                recipients: Array.isArray(resolved.recipients)
                    ? resolved.recipients.filter((value): value is string => typeof value === "string")
                    : undefined,
                rawRecipients: Array.isArray(resolved.rawRecipients)
                    ? resolved.rawRecipients.filter((value): value is string | { id?: string; } => typeof value === "string" || Boolean(value && typeof value === "object"))
                    : undefined,
                isDM: typeof resolved.isDM === "function" ? (resolved.isDM as () => boolean) : undefined,
                isGroupDM: typeof resolved.isGroupDM === "function" ? (resolved.isGroupDM as () => boolean) : undefined,
                getRecipientId: typeof resolved.getRecipientId === "function" ? (resolved.getRecipientId as () => string | null | undefined) : undefined
            };
        }
        if (candidate.channel) {
            const nested = resolveChannelFromPayload(candidate.channel);
            if (nested) return nested;
        }
        if (typeof candidate.channel_id === "string") {
            const fallback: ChannelLike = { id: candidate.channel_id };
            if (Array.isArray(candidate.recipients)) {
                fallback.recipients = candidate.recipients.filter((value): value is string => typeof value === "string");
            }
            if (Array.isArray(candidate.rawRecipients)) {
                fallback.rawRecipients = candidate.rawRecipients.filter((value): value is string | { id?: string; } => {
                    if (typeof value === "string") return true;
                    return Boolean(value && typeof value === "object");
                });
            }
            if (typeof candidate.type === "number") fallback.type = candidate.type;
            if (typeof candidate.name === "string") fallback.name = candidate.name;
            return fallback;
        }
    }

    const channelId = extractChannelId(input);
    if (!channelId) return null;
    return ChannelStore.getChannel(channelId) ?? { id: channelId };
}

function deriveDmRecipient(channel: ChannelLike | null): string | undefined {
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

function trackClosedChannel(channel: ChannelLike | null) {
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
        } catch {
            dmChannelId = null;
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

        const patched = function patchedChannelClose(this: unknown, ...args: unknown[]) {
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
            } catch {
                lastClosedDm = lastClosedDm ?? null;
            }
            return (original as (...inner: unknown[]) => unknown).apply(this, args);
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
            } catch {
                continue;
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
const GuildMembershipActions = findByPropsLazy("leaveGuild");
const HeadphonesIcon = findExportedComponentLazy("HeadphonesIcon");
const UserGuildSettingsStore = findStoreLazy("UserGuildSettingsStore");
const NotificationsInboxStore = findStoreLazy("NotificationsInboxStore") as NotificationsInboxStoreLike;
const RecentMentionsStore = findStoreLazy("RecentMentionsStore") as RecentMentionsStoreLike;
const ReadStateStoreRef = (ReadStateStore as ReadStateStoreLike | undefined) ?? (findStoreLazy("ReadStateStore") as ReadStateStoreLike | undefined);
const channelStoreAccessors = ChannelStore as ChannelStoreAccessorMixins;

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
    categoryId?: string;
    showConfirmation?: boolean;
    iconId?: CustomCommandIconId;
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
    } catch {
        setCustomCommands([]);
    }
})();

export const DISCORD_INTERNAL_HOSTS = new Set([
    "discord.com",
    "www.discord.com",
    "canary.discord.com",
    "ptb.discord.com"
]);

const DISCORD_SETTINGS_ROUTE_ALIASES = new Map<string, string[]>([
    ["my_account", ["my_account_panel", "account"]],
    ["data_and_privacy", ["privacy_and_safety", "privacy_&_safety", "data_and_privacy_panel"]],
    ["notifications", ["legacy_notifications_settings", "notifications_panel"]],
    ["voice_and_video", ["voice_video", "voice_and_video_panel"]],
    ["text_and_images", ["text_images", "text_and_images_panel"]],
    ["appearance", ["appearance_panel"]],
    ["accessibility", ["accessibility_panel"]],
    ["keybinds", ["keybinds_panel"]],
    ["advanced", ["advanced_panel"]]
]);

const DISCORD_SETTINGS_ROUTE_LOOKUP = (() => {
    const lookup = new Map<string, string>();
    for (const [canonical, aliases] of DISCORD_SETTINGS_ROUTE_ALIASES) {
        lookup.set(canonical, canonical);
        for (const alias of aliases) {
            lookup.set(alias, canonical);
        }
    }
    return lookup;
})();

function normalizeSettingsRouteInput(route: string): string {
    return route
        .trim()
        .toLowerCase()
        .replace(/^\/+/, "")
        .replace(/\s+/g, "_")
        .replace(/&/g, "and");
}

function resolveCanonicalSettingsRoute(route: string): string {
    const normalized = normalizeSettingsRouteInput(route);
    return DISCORD_SETTINGS_ROUTE_LOOKUP.get(normalized) ?? normalized;
}

function resolveSettingsRouteCandidates(route: string): string[] {
    const normalized = normalizeSettingsRouteInput(route);
    if (!normalized) return [];

    const canonical = resolveCanonicalSettingsRoute(normalized);
    const aliases = DISCORD_SETTINGS_ROUTE_ALIASES.get(canonical) ?? [];
    const candidates = [canonical, ...aliases, normalized];
    const seen = new Set<string>();
    const unique: string[] = [];

    for (const candidate of candidates) {
        const sanitized = normalizeSettingsRouteInput(candidate);
        if (!sanitized) continue;

        const expanded = sanitized.endsWith("_panel")
            ? [sanitized, sanitized.slice(0, -"_panel".length)]
            : [`${sanitized}_panel`, sanitized];

        for (const expandedCandidate of expanded) {
            const normalizedCandidate = normalizeSettingsRouteInput(expandedCandidate);
            if (!normalizedCandidate || seen.has(normalizedCandidate)) continue;
            seen.add(normalizedCandidate);
            unique.push(normalizedCandidate);
        }
    }

    return unique;
}

async function openDiscordSettingsRoute(route: string, label?: string) {
    const candidates = resolveSettingsRouteCandidates(route);
    if (candidates.length === 0) {
        showToast("No settings page was provided.", Toasts.Type.FAILURE);
        return false;
    }

    for (const candidate of candidates) {
        try {
            await Promise.resolve(SettingsRouter.openUserSettings(candidate));
            return true;
        } catch {
            continue;
        }
    }

    showToast(`Unable to open ${label ?? "that settings page"}.`, Toasts.Type.FAILURE);
    return false;
}

function openExternalUrl(url: string) {
    const discordNative = window as WindowWithDiscordNative;
    const external = discordNative.DiscordNative?.app?.openExternalURL;
    if (typeof external === "function") {
        external(url);
        return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
}

function openDevToolsWindow() {
    const discordNative = window as WindowWithDiscordNative;
    const nativeWindow = discordNative.DiscordNative?.window;

    if (typeof nativeWindow?.openDevTools === "function") {
        nativeWindow.openDevTools();
        return true;
    }

    if (typeof nativeWindow?.toggleDevTools === "function") {
        nativeWindow.toggleDevTools();
        return true;
    }

    try {
        FluxDispatcher.dispatch({
            type: "DEV_TOOLS_SETTINGS_UPDATE",
            settings: {
                displayTools: true,
                lastOpenTabId: "analytics"
            }
        });
        return true;
    } catch (error) {
        logger.error("Failed to open DevTools via FluxDispatcher fallback", error);
    }

    return false;
}

function getLastPrivateChannelId(): string | null {
    const channels = channelStoreAccessors.getSortedPrivateChannels?.() ?? [];

    for (const raw of channels) {
        const channelId = typeof raw === "string" ? raw : raw?.id ?? raw?.channelId ?? null;
        if (!channelId) continue;

        const channel = ChannelStore.getChannel(channelId);
        const isDm = channel && (typeof channel.isDM === "function" ? channel.isDM() : channel.type === 1);
        const isGroupDm = channel && (typeof channel.isGroupDM === "function" ? channel.isGroupDM() : channel.type === 3);
        if (!isDm && !isGroupDm) continue;
        return channelId;
    }

    return null;
}

function getMessagePermalink(channelId: string, messageId: string): string {
    const channel = ChannelStore.getChannel(channelId);
    const guildId = channel?.guild_id ?? "@me";
    return `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;
}

function copyDebugContext() {
    const guildId = getActiveGuildId();
    const channelId = SelectedChannelStore?.getChannelId?.();
    const userId = UserStore?.getCurrentUser?.()?.id;
    const payload = [
        `guildId=${guildId ?? "@me"}`,
        `channelId=${channelId ?? "none"}`,
        `userId=${userId ?? "unknown"}`
    ].join("\n");
    return copyWithToast(payload, "Debug context copied.");
}

function toggleDoNotDisturb() {
    if (!StatusSetting) {
        showToast("Unable to change status right now.", Toasts.Type.FAILURE);
        return;
    }

    const current = StatusSetting.getSetting?.() ?? "online";
    const target = current === "dnd" ? "online" : "dnd";
    setPresenceStatus(target);
}

function isDiscordHost(host: string): boolean {
    return DISCORD_INTERNAL_HOSTS.has(host.toLowerCase());
}

function toDiscordInternalRoute(url: URL): string | null {
    if (!isDiscordHost(url.hostname)) return null;
    const path = `${url.pathname}${url.search}${url.hash}`.trim();
    if (!path) return "/";
    return path.startsWith("/") ? path : `/${path}`;
}

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
                    return { type: "settings", route: resolveCanonicalSettingsRoute(String(action.route ?? "")) } as CustomCommandAction;
                case "url":
                    return { type: "url", url: String(action.url ?? ""), openExternal: Boolean(action.openExternal) } as CustomCommandAction;
                case "macro": {
                    const macroAction = action as { steps?: unknown; };
                    const rawSteps = macroAction.steps;
                    if (!Array.isArray(rawSteps)) return { type: "macro", steps: [] } as CustomCommandAction;
                    return {
                        type: "macro",
                        steps: rawSteps.map((step: unknown) => String(step)).filter(Boolean)
                    } as CustomCommandAction;
                }
                default:
                    return null;
            }
        })();

        if (!normalizedAction) continue;

        const keywords = Array.isArray(entry.keywords)
            ? entry.keywords.map(keyword => String(keyword).trim()).filter(Boolean)
            : [];

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
            categoryId: entry.categoryId ? String(entry.categoryId) : undefined,
            showConfirmation: Boolean((entry as { showConfirmation?: unknown; danger?: unknown; }).showConfirmation ?? (entry as { danger?: unknown; }).danger),
            iconId: isCustomCommandIconId((entry as { iconId?: unknown; }).iconId)
                ? (entry as { iconId: CustomCommandIconId; }).iconId
                : undefined,
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
        keywords: command.keywords ? [...command.keywords] : undefined
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
        keywords: command.keywords ? [...command.keywords] : undefined
    }));
}

export function getCustomCommandById(commandId: string): CustomCommandDefinition | undefined {
    return customCommands.find(command => command.id === commandId);
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
    } catch {
        return;
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

export function setStatusDndForDuration(durationMinutes: number) {
    if (!Number.isFinite(durationMinutes) || durationMinutes < 1) {
        showToast("Choose a valid duration.", Toasts.Type.FAILURE);
        return false;
    }

    scheduleStatusReset(Math.floor(durationMinutes));
    return true;
}

export function cancelScheduledStatusReset() {
    clearScheduledStatusReset(true);
}

function ensureSessionHooks() {
    if (sessionHooksInitialized) return;
    sessionHooksInitialized = true;

    patchChannelCloseMethods();

    const handleChannelClose = (payload: unknown) => {
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
    const registryStore = createRegistryStore();
    clearScheduledStatusReset(false);
    while (sessionCleanupCallbacks.length) {
        const callback = sessionCleanupCallbacks.pop();
        try {
            callback?.();
        } catch {
            continue;
        }
    }
    while (runtimeCleanupCallbacks.length) {
        const callback = runtimeCleanupCallbacks.pop();
        try {
            callback?.();
        } catch {
            continue;
        }
    }
    for (const record of contextProviders.values()) {
        try {
            record.unsubscribe?.();
        } catch {
            continue;
        }
        record.unsubscribe = undefined;
        record.commandIds.clear();
    }
    lastClosedDm = null;
    contextProviders.clear();
    categories.clear();
    registry.clear();
    registryStore.setCachedSortedCommands(null);
    registryStore.getCategoryCommandCache().clear();
    registryStore.getTreeCommandCache().clear();
    registryStore.clearSearchTextCache();
    commandTagIds.clear();
    tagMetadata.clear();
    builtInsRegistered = false;
    registryStore.bumpRegistryVersion();
}

export function getCategoryWeight(categoryId?: string): number {
    if (!categoryId) return DEFAULT_CATEGORY_WEIGHT;
    return CATEGORY_WEIGHTS.get(categoryId) ?? DEFAULT_CATEGORY_WEIGHT;
}

export function getCategoryGroupLabel(categoryId?: string): string {
    return CATEGORY_GROUP_LABELS.get(categoryId) ?? "Other";
}

export function getRecentRank(commandId: string): number {
    const registryStore = createRegistryStore();
    const recentsStore = createRecentsStore(() => registryStore.bumpRegistryVersion());
    return recentsStore.list().indexOf(commandId);
}

function refreshContextProvider(id: string) {
    const pinsStore = createPinsStore();

    const record = contextProviders.get(id);
    if (!record) return;

    const { commandIds } = record;
    const previousIds = Array.from(commandIds);
    const preservedPins = new Set<string>();

    if (previousIds.length) {
        for (const commandId of previousIds) {
            const preservePin = pinsStore.has(commandId);
            if (preservePin) preservedPins.add(commandId);
            removeCommand(commandId, preservePin ? { preservePin: true } : undefined);
            commandIds.delete(commandId);
        }
    }

    let commands: CommandEntry[] = [];
    try {
        commands = record.provider.getCommands() ?? [];
    } catch {
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
            if (!nextIds.has(commandId) && pinsStore.has(commandId)) {
                pinsStore.delete(commandId);
                changed = true;
            }
        }
        if (changed) pinsStore.emit();
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
    const registryStore = createRegistryStore();
    const pinsStore = createPinsStore();
    const existing = registry.get(commandId);
    if (!existing) return;

    const wasPinned = pinsStore.has(commandId);

    registry.delete(commandId);

    if (wasPinned && !options?.preservePin) {
        pinsStore.delete(commandId);
        pinsStore.emit();
    }

    registryStore.deleteCommandSearchText(commandId);

    const tagIds = commandTagIds.get(commandId);
    if (tagIds) {
        for (const tagId of tagIds) {
            decrementTagMetadata(tagId);
        }
        commandTagIds.delete(commandId);
    }

    registryStore.bumpRegistryVersion();
}

export function getCommandById(commandId: string): CommandEntry | undefined {
    return registry.get(commandId);
}

export function listExtensions(): ExtensionDefinition[] {
    const registryStore = createRegistryStore();
    const extensionsState = createExtensionsState(
        id => refreshContextProvider(id),
        () => registryStore.bumpRegistryVersion()
    );
    return extensionsState.listExtensions().map(extension => ({ ...extension }));
}

export function isExtensionInstalled(extensionId: string): boolean {
    const registryStore = createRegistryStore();
    const extensionsState = createExtensionsState(
        id => refreshContextProvider(id),
        () => registryStore.bumpRegistryVersion()
    );
    return extensionsState.isInstalled(extensionId);
}

export async function installExtension(extensionId: string): Promise<boolean> {
    const registryStore = createRegistryStore();
    const extensionsState = createExtensionsState(
        id => refreshContextProvider(id),
        () => registryStore.bumpRegistryVersion()
    );
    return extensionsState.install(extensionId);
}

export async function uninstallExtension(extensionId: string): Promise<boolean> {
    const registryStore = createRegistryStore();
    const extensionsState = createExtensionsState(
        id => refreshContextProvider(id),
        () => registryStore.bumpRegistryVersion()
    );
    return extensionsState.uninstall(extensionId);
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
    const registryStore = createRegistryStore();
    const recentsStore = createRecentsStore(() => registryStore.bumpRegistryVersion());
    void recentsStore.record(commandId);
}

export function markCommandAsRecent(commandId: string) {
    if (!registry.has(commandId)) return;
    recordRecent(commandId);
}

export function getRecentCommands(): CommandEntry[] {
    const registryStore = createRegistryStore();
    const recentsStore = createRecentsStore(() => registryStore.bumpRegistryVersion());
    const results: CommandEntry[] = [];
    for (const id of recentsStore.list()) {
        const entry = registry.get(id);
        if (entry) results.push(entry);
    }
    return results;
}

function getNewestRecentCommand(excludeId?: string): CommandEntry | undefined {
    const registryStore = createRegistryStore();
    const recentsStore = createRecentsStore(() => registryStore.bumpRegistryVersion());
    const id = recentsStore.newest(excludeId);
    if (!id) return undefined;
    const entry = registry.get(id);
    if (!entry || recentsStore.isSkippable(id)) return undefined;
    return entry;
}

async function prunePinned() {
    const pinsStore = createPinsStore();
    let changed = false;
    for (const id of pinsStore.values()) {
        if (!registry.has(id)) {
            pinsStore.delete(id);
            changed = true;
        }
    }
    if (changed) {
        await pinsStore.persist();
    }
    return changed;
}

const BUILT_IN_COMMANDS: CommandEntry[] = [
    {
        id: "open-equicord-settings",
        label: "Open Equicord Settings",
        keywords: ["settings", "equicord"],
        categoryId: DEFAULT_CATEGORY_ID,
        tags: [TAG_NAVIGATION, TAG_CORE],
        handler: () => SettingsRouter.openUserSettings("equicord_main_panel")
    },
    {
        id: "reload-windows",
        label: "Reload Discord",
        description: "Reloads the current Discord window",
        keywords: ["reload", "refresh", "restart client", "developer"],
        categoryId: DEFAULT_CATEGORY_ID,
        tags: [TAG_DEVELOPER, TAG_UTILITY],
        handler: () => window.location.reload()
    }
];

const DISCORD_SETTINGS_COMMANDS: Array<{ id: string; label: string; route: string; keywords: string[]; description?: string; }> = [
    { id: "settings-account", label: "Open My Account", route: "my_account", keywords: ["account", "profile"] },
    { id: "settings-profiles", label: "Open Profiles", route: "profiles", keywords: ["profile", "avatar", "bio"] },
    { id: "settings-privacy", label: "Open Data & Privacy", route: "data_and_privacy", keywords: ["privacy", "safety", "data"] },
    { id: "settings-notifications", label: "Open Notifications", route: "notifications", keywords: ["notifications"] },
    { id: "settings-voice", label: "Open Voice & Video", route: "voice_and_video", keywords: ["voice", "video", "audio", "mic", "microphone", "input", "output", "speaker", "camera"] },
    { id: "settings-chat", label: "Open Chat", route: "chat", keywords: ["chat", "messages"] },
    { id: "settings-text", label: "Open Text & Images", route: "text_and_images", keywords: ["text", "images"] },
    { id: "settings-appearance", label: "Open Appearance", route: "appearance", keywords: ["appearance", "theme"] },
    { id: "settings-accessibility", label: "Open Accessibility", route: "accessibility", keywords: ["accessibility"] },
    { id: "settings-devices", label: "Open Devices", route: "devices", keywords: ["devices", "sessions"] },
    { id: "settings-connections", label: "Open Connections", route: "connections", keywords: ["connections", "accounts", "integrations"] },
    { id: "settings-authorized-apps", label: "Open Authorized Apps", route: "authorized_apps", keywords: ["authorized", "apps", "oauth"] },
    { id: "settings-family-center", label: "Open Family Center", route: "family_center", keywords: ["family", "safety"] },
    { id: "settings-keybinds", label: "Open Keybinds", route: "keybinds", keywords: ["keybinds", "shortcuts"] },
    { id: "settings-advanced", label: "Open Advanced", route: "advanced", keywords: ["advanced"] }
];

const settingsCommandsById = new Map<string, typeof DISCORD_SETTINGS_COMMANDS[number]>();
const settingsCommandsByRoute = new Map<string, typeof DISCORD_SETTINGS_COMMANDS[number]>();

let builtInsRegistered = false;

export function registerCategory(category: CommandCategory) {
    const registryStore = createRegistryStore();
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
    registryStore.bumpRegistryVersion();
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
    const registryStore = createRegistryStore();
    const pinsStore = createPinsStore();
    const preservePin = pinsStore.has(entry.id);
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
    registryStore.setCommandSearchText(entry.id, computeSearchText(normalized));
    registryStore.bumpRegistryVersion();
}

export function listCommands(): CommandEntry[] {
    const registryStore = createRegistryStore();
    const cached = registryStore.getCachedSortedCommands();
    if (cached) {
        return cached;
    }

    const sorted = Array.from(registry.values()).sort((a, b) => a.label.localeCompare(b.label));
    registryStore.setCachedSortedCommands(sorted);
    return sorted;
}

export function listCommandsByCategory(categoryId: string): CommandEntry[] {
    const registryStore = createRegistryStore();
    const categoryCommandCache = registryStore.getCategoryCommandCache();
    const cached = categoryCommandCache.get(categoryId);
    if (cached) return cached;

    const filtered = listCommands().filter(entry => entry.categoryId === categoryId);
    categoryCommandCache.set(categoryId, filtered);
    return filtered;
}

export function isCommandPinned(commandId: string): boolean {
    const pinsStore = createPinsStore();
    return pinsStore.has(commandId);
}

export async function togglePinned(commandId: string): Promise<boolean | null> {
    const pinsStore = createPinsStore();
    await pinsStore.ready;
    if (!commandId) return null;

    if (!registry.has(commandId)) {
        refreshAllContextProviders();
    }

    if (!registry.has(commandId)) {
        return null;
    }

    const willPin = !pinsStore.has(commandId);
    if (willPin) {
        pinsStore.add(commandId);
    } else {
        pinsStore.delete(commandId);
    }

    await pinsStore.persist();
    pinsStore.emit();
    return willPin;
}

export function subscribePinned(listener: (pins: Set<string>) => void) {
    const pinsStore = createPinsStore();
    return pinsStore.subscribe(listener);
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
    const registryStore = createRegistryStore();
    const treeCommandCache = registryStore.getTreeCommandCache();
    const cached = treeCommandCache.get(categoryId);
    if (cached) return cached;

    const categoryIds = collectCategoryTreeIds(categoryId);
    const filtered = listCommands().filter(entry => entry.categoryId && categoryIds.has(entry.categoryId));
    treeCommandCache.set(categoryId, filtered);
    return filtered;
}

export function getCommandSearchText(commandId: string): string {
    const registryStore = createRegistryStore();
    return registryStore.getCommandSearchText(commandId);
}

export function getRegistryVersion(): number {
    const registryStore = createRegistryStore();
    return registryStore.getRegistryVersion();
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
    const registryStore = createRegistryStore();
    return registryStore.subscribeRegistry(listener);
}

function createDefaultCommandActionContext(command: CommandEntry): CommandActionContext {
    return {
        command,
        drilldownCategoryId: command.drilldownCategoryId ?? null,
        isPageOpen: false,
        hasCalculatorResult: false,
        canGoBack: false
    };
}

export type ResolvedCommandAction = ResolvedActionByKey<CommandActionDefinition>;

export function resolveCommandActionByActionKey(entry: CommandEntry, actionKey: string, context: CommandActionContext): ResolvedCommandAction | null {
    return resolveActionByActionKey(entry.actions?.(context), actionKey);
}

export function resolveCommandActionIntentByActionKey(entry: CommandEntry, actionKey: string, context: CommandActionContext): CommandActionIntent | null {
    const intent = resolveActionIntentByActionKey(entry.actions?.(context), actionKey);
    if (!intent) return null;

    switch (intent.type) {
        case "execute-primary":
            return { type: "execute-primary" };
        case "execute-secondary":
            return intent.actionKey ? { type: "execute-secondary", actionKey: intent.actionKey } : null;
        case "open-page":
            return "page" in intent ? { type: "open-page", page: intent.page as PalettePageRef } : null;
        case "open-drilldown":
            return "categoryId" in intent && typeof intent.categoryId === "string"
                ? { type: "open-drilldown", categoryId: intent.categoryId }
                : null;
        case "submit-active-page":
            return { type: "submit-active-page" };
        case "go-back":
            return { type: "go-back" };
        case "copy-calculator":
            return "mode" in intent && (intent.mode === "formatted" || intent.mode === "raw" || intent.mode === "qa")
                ? { type: "copy-calculator", mode: intent.mode }
                : null;
        default:
            return null;
    }
}

export async function executeCommandAction(entry: CommandEntry, actionKey: string = "primary", context?: CommandActionContext): Promise<boolean> {
    const resolvedAction = actionKey === "primary"
        ? null
        : resolveCommandActionByActionKey(entry, actionKey, context ?? createDefaultCommandActionContext(entry));
    const action = actionKey === "primary"
        ? entry.handler
        : resolvedAction?.action.handler;
    if (!action) return false;

    const registryStore = createRegistryStore();
    const recentsStore = createRecentsStore(() => registryStore.bumpRegistryVersion());

    try {
        await action();
        await recentsStore.record(entry.id);
        return true;
    } catch (error) {
        if (error instanceof Error && error.name === "CommandExecutionCanceled") {
            return false;
        }
        Toasts.show({
            message: `Command failed: ${entry.label}`,
            type: Toasts.Type.FAILURE,
            id: Toasts.genId(),
        });
        return false;
    }
}

export async function executeCommand(entry: CommandEntry) {
    await executeCommandAction(entry, "primary");
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
        hiddenInSearch: true,
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

function registerPluginManagerCommands() {
    registerCommand({
        id: PLUGIN_MANAGER_ROOT_COMMAND_ID,
        label: "Plugins",
        description: "Manage plugins by category.",
        keywords: ["plugins", "plugin manager", "enable", "disable", "settings"],
        categoryId: DEFAULT_CATEGORY_ID,
        tags: [TAG_PLUGINS, TAG_NAVIGATION],
        drilldownCategoryId: "plugins",
        handler: () => undefined
    });

    registerCommand({
        id: PLUGIN_MANAGER_ENABLE_COMMAND_ID,
        label: "Enable",
        description: "Enable plugins.",
        keywords: ["plugins", "enable"],
        categoryId: "plugins",
        tags: [TAG_PLUGINS, TAG_NAVIGATION],
        hiddenInSearch: true,
        drilldownCategoryId: "plugins-enable",
        handler: () => undefined
    });

    registerCommand({
        id: PLUGIN_MANAGER_DISABLE_COMMAND_ID,
        label: "Disable",
        description: "Disable plugins.",
        keywords: ["plugins", "disable"],
        categoryId: "plugins",
        tags: [TAG_PLUGINS, TAG_NAVIGATION],
        hiddenInSearch: true,
        drilldownCategoryId: "plugins-disable",
        handler: () => undefined
    });

    registerCommand({
        id: PLUGIN_MANAGER_SETTINGS_COMMAND_ID,
        label: "Settings",
        description: "Open plugin settings and actions.",
        keywords: ["plugins", "settings", "actions"],
        categoryId: "plugins",
        tags: [TAG_PLUGINS, TAG_NAVIGATION],
        hiddenInSearch: true,
        drilldownCategoryId: "plugins-settings",
        handler: () => undefined
    });
}

function readField(record: Record<string, unknown>, keys: string[]): unknown {
    for (const key of keys) {
        if (key in record) return record[key];
    }
    return undefined;
}

function toRecord(input: unknown): Record<string, unknown> | null {
    if (!input || typeof input !== "object") return null;
    return input as Record<string, unknown>;
}

function parseTimestamp(input: unknown): number | undefined {
    if (typeof input === "number" && Number.isFinite(input)) return input;
    if (typeof input !== "string") return undefined;
    const parsed = Date.parse(input);
    if (Number.isNaN(parsed)) return undefined;
    return parsed;
}

function cleanMentionContent(input: string | undefined): string | undefined {
    if (!input) return undefined;
    const normalized = input.replace(/\s+/g, " ").trim();
    if (!normalized) return undefined;
    return normalized.length > 80 ? `${normalized.slice(0, 79)}…` : normalized;
}

function normalizeMentionEntry(input: unknown): MentionEntry | null {
    const root = toRecord(input);
    if (!root) return null;

    const nested = [
        root,
        toRecord(root.message),
        toRecord(root.messageSnapshot),
        toRecord(root.rawMessage),
        toRecord(root.latestMessage)
    ].filter(Boolean) as Array<Record<string, unknown>>;

    const readString = (keys: string[]): string | undefined => {
        for (const source of nested) {
            const value = readField(source, keys);
            if (typeof value === "string" && value.length) return value;
        }
        return undefined;
    };

    const readId = (keys: string[]): string | undefined => {
        for (const source of nested) {
            const value = readField(source, keys);
            if (typeof value === "string" && value.length) return value;
            if (typeof value === "number" && Number.isFinite(value)) return `${Math.trunc(value)}`;
            if (typeof value === "bigint") return value.toString();
        }
        return undefined;
    };

    const readTimestamp = (): number | undefined => {
        for (const source of nested) {
            const value = readField(source, ["timestamp", "created_at", "sent_at"]);
            const parsed = parseTimestamp(value);
            if (parsed != null) return parsed;
        }
        return undefined;
    };

    const authorFromNested = () => {
        for (const source of nested) {
            const author = toRecord(source.author) ?? toRecord(source.user);
            if (!author) continue;
            const id = readField(author, ["id", "user_id"]);
            if (typeof id === "string" && id.length) return id;
            if (typeof id === "number" && Number.isFinite(id)) return `${Math.trunc(id)}`;
            if (typeof id === "bigint") return id.toString();
        }
        return undefined;
    };

    const messageId = readId(["message_id", "id"]);
    const channelId = readId(["channel_id", "channelId"]);
    if (!messageId && !channelId) return null;

    const guildId = readId(["guild_id", "guildId"]);
    const authorId = readId(["author_id", "user_id", "authorId"]) ?? authorFromNested();
    const content = cleanMentionContent(readString(["content", "message_content", "title", "summary"]));
    const timestamp = readTimestamp();
    const key = messageId ? `message-${messageId}` : `channel-${channelId}`;

    return {
        key,
        messageId,
        channelId,
        guildId,
        authorId,
        content,
        timestamp
    };
}

function collectMentionEntries(): MentionEntry[] {
    const fromInbox = NotificationsInboxStore?.getInboxMessages?.() ?? [];
    const fromRecentSettings = RecentMentionsStore?.getSettingsFilteredMentions?.() ?? [];
    const fromRecent = RecentMentionsStore?.getMentions?.() ?? [];
    const merged = [
        ...(Array.isArray(fromInbox) ? fromInbox : []),
        ...(Array.isArray(fromRecentSettings) ? fromRecentSettings : []),
        ...(Array.isArray(fromRecent) ? fromRecent : [])
    ];
    const mentionChannelIds = ReadStateStoreRef?.getMentionChannelIds?.() ?? [];
    const readStatesByChannel = ReadStateStoreRef?.getReadStatesByChannel?.() ?? {};
    const activeMentionChannelIds = new Set<string>();
    const canReadMentionState = Boolean(ReadStateStoreRef?.getMentionChannelIds || ReadStateStoreRef?.getMentionCount);

    for (const channelId of mentionChannelIds) {
        if (typeof channelId !== "string" || !channelId) continue;
        activeMentionChannelIds.add(channelId);
    }

    for (const channelId of Object.keys(readStatesByChannel)) {
        if (!channelId) continue;
        const mentionCount = Math.max(0, ReadStateStoreRef?.getMentionCount?.(channelId) ?? 0);
        if (mentionCount <= 0) continue;
        activeMentionChannelIds.add(channelId);
    }

    const seen = new Set<string>();
    const normalized: MentionEntry[] = [];
    const contentByChannelId = new Map<string, string>();

    for (const value of merged) {
        const entry = normalizeMentionEntry(value);
        if (!entry) continue;
        if (!entry.channelId) continue;
        if (
            canReadMentionState
            && entry.channelId
            && activeMentionChannelIds.size > 0
            && !activeMentionChannelIds.has(entry.channelId)
        ) {
            continue;
        }
        if (seen.has(entry.key)) continue;
        seen.add(entry.key);
        normalized.push(entry);
        if (entry.channelId && entry.content && !contentByChannelId.has(entry.channelId)) {
            contentByChannelId.set(entry.channelId, entry.content);
        }
    }

    const addChannelPingEntry = (channelId: string, forceMention = false) => {
        if (!channelId || seen.has(`channel-${channelId}`)) return;
        const channel = ChannelStore.getChannel(channelId);
        if (!channel) {
            if (!forceMention) return;
            seen.add(`channel-${channelId}`);
            normalized.push({
                key: `channel-${channelId}`,
                channelId,
                content: "@ ping"
            });
            return;
        }

        const mentionCount = Math.max(0, ReadStateStoreRef?.getMentionCount?.(channelId) ?? 0);
        const isDm = typeof channel.isDM === "function" ? channel.isDM() : channel.type === 1;
        const isGroupDm = typeof channel.isGroupDM === "function" ? channel.isGroupDM() : channel.type === 3;
        const hasPing = forceMention || mentionCount > 0;

        if (!hasPing) return;

        const recipientId = isDm ? channel.recipients?.[0] : undefined;
        const recipient = recipientId ? UserStore.getUser(recipientId) : undefined;
        const recipientName = recipient?.globalName ?? recipient?.username;
        const fallbackContent = isDm
            ? (recipientName ? `@ ping from ${recipientName}` : "@ ping in direct message")
            : isGroupDm
                ? (channel.name ? `@ ping in ${channel.name}` : "@ ping in group DM")
                : (channel.name ? `@ ping in #${channel.name}` : "@ ping in server channel");
        const content = contentByChannelId.get(channelId) ?? fallbackContent;

        seen.add(`channel-${channelId}`);
        normalized.push({
            key: `channel-${channelId}`,
            channelId,
            guildId: channel.guild_id ?? undefined,
            authorId: recipientId,
            content
        });
    };

    for (const channelId of mentionChannelIds) {
        if (typeof channelId !== "string" || !channelId) continue;
        addChannelPingEntry(channelId, true);
    }

    for (const channelId of Object.keys(readStatesByChannel)) {
        if (!channelId) continue;
        const mentionCount = Math.max(0, ReadStateStoreRef?.getMentionCount?.(channelId) ?? 0);
        if (mentionCount <= 0) continue;
        addChannelPingEntry(channelId, true);
    }

    normalized.sort((left, right) => (right.timestamp ?? 0) - (left.timestamp ?? 0));
    return normalized;
}

function getMentionIcon(entry: MentionEntry) {
    if (entry.authorId) {
        const user = UserStore.getUser(entry.authorId);
        const userIcon = user ? IconUtils.getUserAvatarURL(user) : undefined;
        if (userIcon) return makeIconFromUrl(userIcon);
    }

    if (entry.guildId) {
        const guild = GuildStore.getGuild(entry.guildId);
        const guildIcon = guild ? IconUtils.getGuildIconURL({ id: guild.id, icon: guild.icon, size: 64 }) : undefined;
        if (guildIcon) return makeIconFromUrl(guildIcon);
    }

    return undefined;
}

function getMentionRoute(entry: MentionEntry): string | null {
    const { channelId, guildId, messageId } = entry;
    if (!channelId) return null;

    const channel = ChannelStore.getChannel(channelId);
    const nextGuildId = guildId ?? channel?.guild_id ?? null;
    const routeGuildId = nextGuildId ?? "@me";
    if (messageId) return `/channels/${routeGuildId}/${channelId}/${messageId}`;
    return `/channels/${routeGuildId}/${channelId}`;
}

function navigateToMention(entry: MentionEntry): boolean {
    const { channelId, messageId } = entry;
    if (!channelId) return false;

    const channel = ChannelStore.getChannel(channelId);
    const guildId = entry.guildId ?? channel?.guild_id ?? null;

    if (guildId) {
        if (messageId) {
            NavigationRouter.transitionTo(`/channels/${guildId}/${channelId}/${messageId}`);
            return true;
        }

        NavigationRouter.transitionToGuild(guildId, channelId);
        return true;
    }

    ChannelRouter.transitionToChannel(channelId);
    return true;
}

function getMentionSubtitle(entry: MentionEntry): string {
    const { channelId, guildId } = entry;
    if (!channelId) return "Mention";

    const channel = ChannelStore.getChannel(channelId);
    const channelName = channel?.name ? `#${channel.name}` : "Direct Message";
    const guildName = GuildStore.getGuild(guildId ?? "")?.name ?? "";
    if (!guildName || guildName === channelName) return channelName;
    return `${channelName} • ${guildName}`;
}

function createMentionCommands(): CommandEntry[] {
    const mentions = collectMentionEntries();

    if (mentions.length === 0) {
        return [];
    }

    return mentions.map((mention, index) => {
        const subtitle = getMentionSubtitle(mention);
        const { content } = mention;
        const icon = getMentionIcon(mention);
        const label = content ?? `Open mention ${index + 1}`;

        return {
            id: `mentions-item-${mention.key}`,
            label,
            description: subtitle,
            keywords: ["mentions", "inbox", subtitle.toLowerCase()],
            categoryId: MENTIONS_CATEGORY_ID,
            hiddenInSearch: true,
            icon,
            tags: [TAG_NAVIGATION],
            closeAfterExecute: true,
            handler: () => {
                if (navigateToMention(mention)) return;
                const route = getMentionRoute(mention);
                if (route) {
                    NavigationRouter.transitionTo(route);
                    return;
                }
                showToast("This mention is no longer available.", Toasts.Type.FAILURE);
            }
        } satisfies CommandEntry;
    });
}

export function getMentionCommandsSnapshot(): CommandEntry[] {
    return createMentionCommands();
}

function registerMentionsProvider() {
    registerContextProvider({
        id: MENTION_PROVIDER_ID,
        getCommands: () => createMentionCommands(),
        subscribe: refresh => {
            const events = [
                "CONNECTION_OPEN",
                "LOAD_RECENT_MENTIONS_SUCCESS",
                "NOTIFICATIONS_INBOX_LOAD_MORE_INBOX_SUCCESS",
                "NOTIFICATIONS_INBOX_ITEM_ACK",
                "RECENT_MENTION_DELETE",
                "MESSAGE_CREATE",
                "MESSAGE_DELETE"
            ];

            for (const event of events) {
                FluxDispatcher.subscribe?.(event, refresh);
            }

            return () => {
                for (const event of events) {
                    FluxDispatcher.unsubscribe?.(event, refresh);
                }
            };
        }
    });
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
            hiddenInSearch: true,
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
            } catch {
                showToast("Failed to check for updates.", Toasts.Type.FAILURE);
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
        handler: () => SettingsRouter.openUserSettings("equicord_changelog_panel")
    });
}

function registerDiscordSettingsCommands() {
    const buildSettingsKeywords = (command: typeof DISCORD_SETTINGS_COMMANDS[number]) => {
        const routePhrases = [
            command.route,
            command.route.replace(/_/g, " "),
            ...resolveSettingsRouteCandidates(command.route)
        ];

        return Array.from(new Set([
            ...command.keywords,
            ...routePhrases,
            "open settings",
            "discord settings"
        ]));
    };

    for (const command of DISCORD_SETTINGS_COMMANDS) {
        settingsCommandsById.set(command.id, command);
        const routeCandidates = resolveSettingsRouteCandidates(command.route);
        for (const candidate of routeCandidates) {
            settingsCommandsByRoute.set(candidate, command);
        }
        registerCommand({
            id: command.id,
            label: command.label,
            description: command.description,
            keywords: buildSettingsKeywords(command),
            categoryId: "discord-settings",
            tags: [TAG_NAVIGATION],
            handler: async () => {
                await openDiscordSettingsRoute(command.route, command.label);
            }
        });
    }
}

export function getSettingsCommandMetaById(id: string) {
    return settingsCommandsById.get(id);
}

export function getSettingsCommandMetaByRoute(route: string) {
    const normalized = normalizeSettingsRouteInput(route);
    return settingsCommandsByRoute.get(normalized);
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

function buildChannelRoute(channelId: string): string {
    const channel = ChannelStore.getChannel(channelId);
    const guildId = channel?.guild_id ?? "@me";
    return `/channels/${guildId}/${channelId}`;
}

function getChannelPermalink(channelId: string): string {
    return `https://discord.com${buildChannelRoute(channelId)}`;
}

function getGuildPermalink(guildId: string): string {
    return `https://discord.com/channels/${guildId}`;
}

function getChannelDisplayLabel(channel: ChannelLike | null): string {
    if (!channel) return "Current Channel";
    try {
        if (typeof channel.isDM === "function" && channel.isDM()) return "Direct Message";
        if (typeof channel.isGroupDM === "function" && channel.isGroupDM()) return channel.name ?? "Group DM";
        if (channel.name) return `#${channel.name}`;
        if (channel.rawRecipients?.length) return "Direct Message";
    } catch (error) {
        logger.error("Failed to resolve channel display label", error);
    }
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
    const actions = NotificationSettingsActionCreators as {
        updateChannelOverrideSettings?: (guildId: string | null, channelId: string, payload: Record<string, unknown>) => void;
    } | undefined;
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
    } catch {
        showToast("Failed to update channel mute state.", Toasts.Type.FAILURE);
    }
}

function toggleGuildMuteState(guildId: string, mute: boolean, durationMinutes?: number) {
    const actions = NotificationSettingsActionCreators as {
        updateGuildNotificationSettings?: (guildId: string, payload: Record<string, unknown>) => void;
    } | undefined;
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
    } catch {
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
            } catch {
                continue;
            }
        }
    }

    if (dispatched) return;

    try {
        FluxDispatcher.dispatch({ type: "CHANNEL_PINS_MODAL_OPEN", channelId });
    } catch {
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
                } catch {
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

        commands.push({
            id: "context-channel-copy-link",
            label: `Copy Link to ${channelLabel}`,
            keywords: ["context", "channel", "copy", "link"],
            categoryId: CONTEXT_PROVIDER_ID,
            tags: [TAG_CONTEXT, TAG_UTILITY],
            handler: () => copyWithToast(getChannelPermalink(channelId), "Channel link copied.")
        });

        commands.push({
            id: "context-channel-copy-id",
            label: `Copy ${channelLabel} ID`,
            keywords: ["context", "channel", "copy", "id"],
            categoryId: CONTEXT_PROVIDER_ID,
            tags: [TAG_CONTEXT, TAG_UTILITY],
            handler: () => copyWithToast(channelId, "Channel ID copied.")
        });

        commands.push({
            id: "context-channel-open-browser",
            label: `Open ${channelLabel} in Browser`,
            keywords: ["context", "channel", "open", "browser", "external"],
            categoryId: CONTEXT_PROVIDER_ID,
            tags: [TAG_CONTEXT, TAG_NAVIGATION],
            handler: () => openExternalUrl(getChannelPermalink(channelId))
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
            id: "context-guild-copy-id",
            label: `Copy ${guildLabel} ID`,
            keywords: ["context", "guild", "copy", "id"],
            categoryId: CONTEXT_PROVIDER_ID,
            tags: [TAG_CONTEXT, TAG_UTILITY],
            handler: () => copyWithToast(guildId, "Server ID copied.")
        });

        commands.push({
            id: "context-guild-copy-link",
            label: `Copy Link to ${guildLabel}`,
            keywords: ["context", "guild", "copy", "link"],
            categoryId: CONTEXT_PROVIDER_ID,
            tags: [TAG_CONTEXT, TAG_UTILITY],
            handler: () => copyWithToast(getGuildPermalink(guildId), "Server link copied.")
        });

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
                    } catch {
                        showToast("Unable to open guild settings.", Toasts.Type.FAILURE);
                    }
                }
            });
        }

        if (GuildMembershipActions?.leaveGuild) {
            commands.push({
                id: "context-guild-leave",
                label: `Leave ${guildLabel}`,
                description: "Leaves the current server.",
                keywords: ["context", "guild", "server", "leave", "exit"],
                categoryId: CONTEXT_PROVIDER_ID,
                tags: [TAG_CONTEXT, TAG_UTILITY],
                danger: true,
                handler: async () => {
                    const confirmed = window.confirm(`Leave ${guildLabel}?`);
                    if (!confirmed) return;

                    try {
                        await Promise.resolve(GuildMembershipActions.leaveGuild(guildId));
                        NavigationRouter.transitionTo("/channels/@me");
                        showToast(`Left ${guildLabel}.`, Toasts.Type.SUCCESS);
                    } catch {
                        showToast("Unable to leave this server.", Toasts.Type.FAILURE);
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

class CommandExecutionCanceled extends Error {
    constructor() {
        super("Command execution canceled");
        this.name = "CommandExecutionCanceled";
    }
}

function describeCustomAction(command: CustomCommandDefinition): string {
    const { action } = command;
    switch (action.type) {
        case "command": {
            const targetId = action.commandId.trim();
            const target = targetId ? getCommandById(targetId) : null;
            return target
                ? `Run “${target.label}” (${target.id}).`
                : `Run command ID “${targetId || "not set"}”.`;
        }
        case "settings": {
            const route = action.route.trim();
            const target = route ? getSettingsCommandMetaByRoute(route) : undefined;
            return target
                ? `Open settings page “${target.label}” (${target.route}).`
                : `Open settings route “${route || "not set"}”.`;
        }
        case "url":
            return `Open URL “${action.url.trim() || "not set"}” ${action.openExternal ? "externally" : "inside Discord when possible"}.`;
        case "macro": {
            if (!action.steps.length) return "Run macro with no configured steps.";
            const steps = action.steps.map((step, index) => {
                const target = getCommandById(step);
                return `${index + 1}. ${target?.label ?? "Unknown command"} (${step})`;
            }).join("\n");
            return `Run macro steps:\n${steps}`;
        }
        default:
            return "Run this custom command.";
    }
}

function confirmCustomCommand(command: CustomCommandDefinition): Promise<boolean> {
    return new Promise(resolve => {
        Alerts.show({
            title: command.label || "Confirm command",
            body: (
                <div style={{ whiteSpace: "pre-wrap" }}>
                    {describeCustomAction(command)}
                </div>
            ),
            confirmText: "Yes",
            cancelText: "Cancel",
            onConfirm: () => resolve(true),
            onCancel: () => resolve(false)
        });
    });
}

async function performCustomCommand(command: CustomCommandDefinition) {
    const { action } = command;
    switch (action.type) {
        case "command":
            await runCommandById(action.commandId, new Set([command.id]));
            break;
        case "settings":
            await openDiscordSettingsRoute(action.route);
            break;
        case "url": {
            let parsed: URL;
            try {
                parsed = new URL(action.url.trim());
            } catch {
                showToast("Please enter a valid URL.", Toasts.Type.FAILURE);
                return;
            }

            const isHttpProtocol = parsed.protocol === "http:" || parsed.protocol === "https:";

            if (action.openExternal) {
                if (!isHttpProtocol) {
                    showToast("Only HTTP(S) URLs can be opened externally.", Toasts.Type.FAILURE);
                    return;
                }

                openExternalUrl(parsed.toString());
                return;
            }

            const route = toDiscordInternalRoute(parsed);
            if (route) {
                NavigationRouter.transitionTo(route);
            } else {
                if (!isHttpProtocol) {
                    showToast("Only HTTP(S) URLs can be opened externally.", Toasts.Type.FAILURE);
                    return;
                }

                openExternalUrl(parsed.toString());
                showToast("Non-Discord links open externally.", Toasts.Type.MESSAGE);
            }
            return;
        }
        case "macro":
            await runMacroSteps(action.steps, new Set([command.id]));
            break;
        default:
            showToast("Unsupported custom command action.", Toasts.Type.FAILURE);
            break;
    }
}

async function executeCustomCommand(command: CustomCommandDefinition) {
    try {
        if (command.showConfirmation) {
            const confirmed = await confirmCustomCommand(command);
            if (!confirmed) {
                throw new CommandExecutionCanceled();
            }
        }
        await performCustomCommand(command);
    } catch (error) {
        if (error instanceof CommandExecutionCanceled) {
            throw error;
        }
        throw error;
    }
}

function createCustomCommandEntries(): CommandEntry[] {
    return customCommands.map(command => ({
        id: command.id,
        label: command.label || "Untitled Command",
        description: command.description,
        keywords: command.keywords,
        categoryId: command.categoryId ?? CUSTOM_COMMANDS_CATEGORY_ID,
        icon: getCustomCommandIconById(command.iconId && command.iconId !== "auto" ? command.iconId : resolveCustomCommandDefaultIconId(command.action.type)),
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
    const discordNative = window as WindowWithDiscordNative;
    const notifications = discordNative.DiscordNative?.notifications;
    if (typeof notifications?.clearAll === "function") {
        try {
            notifications.clearAll();
            showToast("Cleared desktop notifications.", Toasts.Type.SUCCESS);
        } catch {
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
            } catch {
                reopenedId = null;
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
    } catch {
        showToast("The DM is no longer available.", Toasts.Type.FAILURE);
    } finally {
        lastClosedDm = null;
    }
}

function registerSessionCommands() {
    ensureSessionHooks();

    const commands: CommandEntry[] = [
        {
            id: "session-dnd-timer",
            label: "Set DND Timer",
            description: "Choose how long Do Not Disturb should stay active.",
            keywords: ["session", "status", "dnd", "timer", "duration", "focus", "busy", "cancel"],
            categoryId: SESSION_TOOLS_CATEGORY_ID,
            tags: [TAG_SESSION, TAG_UTILITY],
            page: { id: "status-timer" },
            handler: () => undefined
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
        const icon = makeIconFromUrl(IconUtils.getGuildIconURL({ id: guild.id, icon: guild.icon, size: 64 }) ?? undefined);
        registerCommand({
            id: `open-guild-${guild.id}`,
            label: `Navigate to ${guild.name}`,
            keywords: ["guild", "server", guild.name.toLowerCase()],
            categoryId: GUILD_CATEGORY_ID,
            hiddenInSearch: true,
            tags: [TAG_GUILDS, TAG_NAVIGATION],
            icon,
            handler: () => {
                NavigationRouter.transitionToGuild(guild.id);
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
        categoryId: "plugins-settings",
        hiddenInSearch: true,
        tags: [TAG_NAVIGATION, TAG_DEVELOPER],
        handler: () => {
            openPluginModal(commandPalette);
        }
    });

    registerCommand({
        id: "command-palette-open-home",
        label: "Go to Home",
        description: "Opens your direct messages home.",
        keywords: ["home", "dm", "messages", "navigate"],
        categoryId: DEFAULT_CATEGORY_ID,
        tags: [TAG_NAVIGATION, TAG_CORE],
        handler: () => NavigationRouter.transitionTo("/channels/@me")
    });

    registerCommand({
        id: "command-palette-open-extensions",
        label: "Extensions",
        description: "Browse installable command palette extensions.",
        keywords: ["extensions", "plugins", "catalog", "install", "uninstall"],
        categoryId: DEFAULT_CATEGORY_ID,
        tags: [TAG_PLUGINS, TAG_UTILITY],
        drilldownCategoryId: EXTENSIONS_CATALOG_CATEGORY_ID,
        handler: () => undefined
    });

    registerCommand({
        id: "command-palette-open-dm-query",
        label: "Open DM",
        description: "Type a username or display name to open a DM.",
        keywords: ["open", "dm", "direct message", "message user", "friend"],
        categoryId: DEFAULT_CATEGORY_ID,
        tags: [TAG_NAVIGATION, TAG_CORE],
        closeAfterExecute: true,
        queryTemplate: "open dm ",
        queryPlaceholder: "Username or display name",
        handler: () => undefined
    });

    registerCommand(createCommandPageCommand({
        id: "command-palette-send-dm",
        label: "Send DM",
        description: "Send a direct message to a user from separate fields.",
        keywords: ["send", "dm", "direct message", "message", "friend", "recipient"],
        categoryId: DEFAULT_CATEGORY_ID,
        tags: [TAG_NAVIGATION, TAG_CORE],
        page: { id: "send-dm" }
    }));

    registerCommand({
        id: "command-palette-navigate-to-query",
        label: "Navigate to",
        description: "Type a server or channel to navigate.",
        keywords: ["navigate", "go to", "jump", "server", "channel", "guild"],
        categoryId: DEFAULT_CATEGORY_ID,
        tags: [TAG_NAVIGATION, TAG_CORE],
        closeAfterExecute: true,
        queryTemplate: "go to ",
        queryPlaceholder: "Server or channel",
        handler: () => undefined
    });

    registerCommand({
        id: "command-palette-toggle-plugin-query",
        label: "Toggle Plugin by Name",
        description: "Type a plugin name to enable or disable it.",
        keywords: ["toggle", "plugin", "enable", "disable", "debug", "developer"],
        categoryId: DEFAULT_CATEGORY_ID,
        tags: [TAG_DEVELOPER, TAG_PLUGINS],
        closeAfterExecute: true,
        queryTemplate: "toggle plugin ",
        queryPlaceholder: "Plugin name",
        handler: () => undefined
    });

    registerCommand({
        id: "command-palette-show-mentions",
        label: "Show Mentions",
        description: "Browse your recent mentions.",
        keywords: ["mentions", "inbox", "unread", "pings"],
        categoryId: DEFAULT_CATEGORY_ID,
        tags: [TAG_NAVIGATION, TAG_CORE],
        drilldownCategoryId: MENTIONS_CATEGORY_ID,
        handler: () => undefined
    });

    registerCommand({
        id: "command-palette-jump-mentions-inbox",
        label: "Jump to Mentions Inbox",
        description: "Shows your mentions inbox.",
        keywords: ["jump", "mentions", "inbox", "unread", "pings"],
        categoryId: DEFAULT_CATEGORY_ID,
        tags: [TAG_NAVIGATION, TAG_CORE],
        drilldownCategoryId: MENTIONS_CATEGORY_ID,
        handler: () => undefined
    });

    registerCommand({
        id: "command-palette-open-last-dm",
        label: "Open Last DM",
        description: "Opens your most recent DM thread.",
        keywords: ["open", "last", "recent", "dm", "messages"],
        categoryId: DEFAULT_CATEGORY_ID,
        tags: [TAG_NAVIGATION, TAG_CORE],
        handler: () => {
            const channelId = getLastPrivateChannelId();
            if (!channelId) {
                showToast("No recent DM available.", Toasts.Type.MESSAGE);
                return;
            }
            NavigationRouter.transitionTo(`/channels/@me/${channelId}`);
        }
    });

    registerCommand({
        id: "command-palette-copy-active-channel-id",
        label: "Copy Current Channel ID",
        description: "Copies the active channel ID.",
        keywords: ["copy", "channel", "id", "current"],
        categoryId: DEFAULT_CATEGORY_ID,
        tags: [TAG_UTILITY, TAG_CORE],
        handler: () => {
            const channelId = SelectedChannelStore?.getChannelId?.();
            if (!channelId) {
                showToast("No active channel available.", Toasts.Type.MESSAGE);
                return;
            }
            return copyWithToast(channelId, "Channel ID copied.");
        }
    });

    registerCommand({
        id: "command-palette-copy-active-channel-link",
        label: "Copy Current Channel Link",
        description: "Copies a link to the active channel.",
        keywords: ["copy", "channel", "link", "current"],
        categoryId: DEFAULT_CATEGORY_ID,
        tags: [TAG_UTILITY, TAG_NAVIGATION],
        handler: () => {
            const channelId = SelectedChannelStore?.getChannelId?.();
            if (!channelId) {
                showToast("No active channel available.", Toasts.Type.MESSAGE);
                return;
            }
            return copyWithToast(getChannelPermalink(channelId), "Channel link copied.");
        }
    });

    registerCommand({
        id: "command-palette-copy-last-message-link",
        label: "Copy Last Message Link",
        description: "Copies a link to the latest message in the current channel.",
        keywords: ["copy", "message", "link", "latest", "last", "current"],
        categoryId: DEFAULT_CATEGORY_ID,
        tags: [TAG_UTILITY, TAG_NAVIGATION],
        handler: () => {
            const channelId = SelectedChannelStore?.getChannelId?.();
            if (!channelId) {
                showToast("No active channel available.", Toasts.Type.MESSAGE);
                return;
            }

            const message = MessageStore.getLastMessage?.(channelId) as { id?: string; } | undefined;
            if (!message?.id) {
                showToast("No recent message available in this channel.", Toasts.Type.MESSAGE);
                return;
            }

            return copyWithToast(getMessagePermalink(channelId, message.id), "Message link copied.");
        }
    });

    registerCommand({
        id: "command-palette-open-active-channel-browser",
        label: "Open Current Channel in Browser",
        description: "Opens the active channel link in your browser.",
        keywords: ["open", "channel", "browser", "external", "current"],
        categoryId: DEFAULT_CATEGORY_ID,
        tags: [TAG_NAVIGATION, TAG_UTILITY],
        handler: () => {
            const channelId = SelectedChannelStore?.getChannelId?.();
            if (!channelId) {
                showToast("No active channel available.", Toasts.Type.MESSAGE);
                return;
            }
            openExternalUrl(getChannelPermalink(channelId));
        }
    });

    registerCommand({
        id: "command-palette-copy-active-guild-id",
        label: "Copy Current Server ID",
        description: "Copies the active server ID.",
        keywords: ["copy", "guild", "server", "id", "current"],
        categoryId: DEFAULT_CATEGORY_ID,
        tags: [TAG_UTILITY, TAG_CORE],
        handler: () => {
            const guildId = getActiveGuildId();
            if (!guildId || guildId === "@me") {
                showToast("No active server available.", Toasts.Type.MESSAGE);
                return;
            }
            return copyWithToast(guildId, "Server ID copied.");
        }
    });

    registerCommand({
        id: "command-palette-copy-my-user-id",
        label: "Copy My User ID",
        description: "Copies your user ID.",
        keywords: ["copy", "user", "id", "me", "account"],
        categoryId: DEFAULT_CATEGORY_ID,
        tags: [TAG_UTILITY, TAG_CORE],
        handler: () => {
            const userId = UserStore?.getCurrentUser?.()?.id;
            if (!userId) {
                showToast("Unable to read your user ID.", Toasts.Type.FAILURE);
                return;
            }
            return copyWithToast(userId, "Your user ID was copied.");
        }
    });

    registerCommand({
        id: "command-palette-copy-debug-context",
        label: "Copy Debug Context",
        description: "Copies current guild, channel, and user IDs.",
        keywords: ["copy", "debug", "context", "guild id", "channel id", "user id", "developer"],
        categoryId: DEFAULT_CATEGORY_ID,
        tags: [TAG_DEVELOPER, TAG_UTILITY],
        handler: copyDebugContext
    });

    registerCommand({
        id: "command-palette-open-devtools",
        label: "Open DevTools",
        description: "Opens Discord DevTools on desktop.",
        keywords: ["devtools", "developer tools", "inspect", "debug", "console"],
        categoryId: DEFAULT_CATEGORY_ID,
        tags: [TAG_DEVELOPER, TAG_UTILITY],
        handler: () => {
            if (openDevToolsWindow()) return;
            showToast("DevTools is unavailable in this environment.", Toasts.Type.FAILURE);
        }
    });

    registerCommand({
        id: "command-palette-show-pins",
        label: "Pinned Commands",
        description: "Browse and run your pinned commands.",
        keywords: ["pinned", "pins", "favorites", "starred"],
        categoryId: DEFAULT_CATEGORY_ID,
        tags: [TAG_CORE, TAG_UTILITY],
        drilldownCategoryId: PINNED_CATEGORY_ID,
        handler: () => undefined
    });

    registerCommand({
        id: "command-palette-show-recent",
        label: "Recent Commands",
        description: "Browse and run your recently used commands.",
        keywords: ["recent", "history", "rerun", "pin"],
        categoryId: DEFAULT_CATEGORY_ID,
        tags: [TAG_CORE, TAG_UTILITY],
        drilldownCategoryId: RECENTS_CATEGORY_ID,
        handler: () => undefined
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
    const commands: Array<{ id: string; label: string; description?: string; handler: () => void; keywords: string[]; tags: string[]; icon?: CommandEntry["icon"]; }> = [
        {
            id: "set-status-online",
            label: "Quick Status: Online",
            handler: () => setPresenceStatus("online"),
            keywords: ["status", "quick", "presence", "online"],
            tags: [TAG_CORE, TAG_UTILITY]
        },
        {
            id: "set-status-idle",
            label: "Quick Status: Idle",
            handler: () => setPresenceStatus("idle"),
            keywords: ["status", "quick", "presence", "idle"],
            tags: [TAG_CORE, TAG_UTILITY]
        },
        {
            id: "set-status-dnd",
            label: "Quick Status: Do Not Disturb",
            handler: () => setPresenceStatus("dnd"),
            keywords: ["status", "quick", "presence", "dnd", "busy"],
            tags: [TAG_CORE, TAG_UTILITY]
        },
        {
            id: "set-status-invisible",
            label: "Quick Status: Invisible",
            handler: () => setPresenceStatus("invisible"),
            keywords: ["status", "quick", "presence", "offline", "invisible"],
            tags: [TAG_CORE, TAG_UTILITY]
        },
        {
            id: "toggle-status-dnd",
            label: "Toggle Do Not Disturb",
            handler: toggleDoNotDisturb,
            keywords: ["toggle", "status", "dnd", "busy", "online"],
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
            tags: [TAG_UTILITY],
            icon: HeadphonesIcon
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
            icon: entry.icon,
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
        categoryId: "plugins-settings",
        hiddenInSearch: true,
        tags: [TAG_PLUGINS, TAG_DEVELOPER, TAG_UTILITY],
        handler: () => void reloadAllPlugins()
    });

    registerCommand({
        id: "enable-all-plugins",
        label: "Enable All Plugins",
        keywords: ["plugin", "enable"],
        categoryId: "plugins-enable",
        hiddenInSearch: true,
        tags: [TAG_PLUGINS, TAG_UTILITY],
        handler: () => void setAllPluginsEnabled(true)
    });

    registerCommand({
        id: "disable-all-plugins",
        label: "Disable All Non-required Plugins",
        keywords: ["plugin", "disable"],
        categoryId: "plugins-disable",
        hiddenInSearch: true,
        tags: [TAG_PLUGINS, TAG_UTILITY],
        handler: () => void setAllPluginsEnabled(false)
    });

    registerCommand({
        id: "restart-equicord",
        label: "Restart Equicord",
        description: "Reloads the Discord client window",
        keywords: ["restart", "reload"],
        categoryId: "plugins-settings",
        hiddenInSearch: true,
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
                hiddenInSearch: true,
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
    } catch {
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
        id: "open-quickcss-editor",
        label: "Open QuickCSS Editor",
        keywords: ["quickcss", "quick css", "css", "editor", "theme"],
        categoryId: DEFAULT_CATEGORY_ID,
        tags: [TAG_CUSTOMIZATION, TAG_NAVIGATION],
        handler: () => {
            const openEditor = (window as { VencordNative?: { quickCss?: { openEditor?: () => void; }; }; })?.VencordNative?.quickCss?.openEditor;
            if (typeof openEditor !== "function") {
                showToast("QuickCSS editor is unavailable.", Toasts.Type.FAILURE);
                return;
            }

            openEditor();
        }
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
        label: "Open Themes",
        keywords: ["theme", "themes", "library"],
        categoryId: DEFAULT_CATEGORY_ID,
        tags: [TAG_CUSTOMIZATION, TAG_NAVIGATION],
        handler: () => SettingsRouter.openUserSettings("equicord_themes_panel")
    });
}

export function registerBuiltInCommands() {
    if (builtInsRegistered) return;
    const registryStore = createRegistryStore();
    const pinsStore = createPinsStore();
    const extensionsState = createExtensionsState(
        id => refreshContextProvider(id),
        () => registryStore.bumpRegistryVersion()
    );

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
    registerPluginManagerCommands();
    registerPluginToggleCommands();
    registerPluginSettingsCommands();
    registerPluginChangeCommands();
    registerPluginToolboxProvider();
    registerExtensionProviders({
        extensionsState,
        registerContextProvider,
        showToast,
        openExternalUrl,
        executeCommand,
        getCommandById
    });
    registerMentionsProvider();
    registerCustomizationCommands();
    registerContextualCommands();
    registerCustomCommandProvider();
    registerSessionCommands();
    registerGuildCommands();

    void pinsStore.ready.then(async () => {
        await prunePinned();
        pinsStore.emit();
    });

    builtInsRegistered = true;
}
