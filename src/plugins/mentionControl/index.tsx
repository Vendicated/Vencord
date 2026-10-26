/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 MentionControl contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isPluginEnabled } from "@api/PluginManager";
import { definePluginSettings } from "@api/Settings";
import { BaseText } from "@components/BaseText";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { factoryListeners, wreq } from "@webpack";
import { AuthenticationStore, ChannelStore, FluxDispatcher, GuildMemberStore, MessageStore, PermissionsBits, PermissionStore, React, ReadStateStore, useEffect, UserGuildSettingsStore, useState, useStateFromStores } from "@webpack/common";

import { AutoReadContext, AutoReadController } from "./autoRead";
import { BindingState, matchesTarget, NOTIFICATION_MODULE_ID } from "./compatibility";
import { ContextReaders, readContext } from "./context";
import { patches } from "./patches";
import { shouldSuppress } from "./policy";
import { defaultDocument, defaultOptions, getAccountOptions, isSnowflake, Options, PreferenceDocument, readDocument, setAccountOptions } from "./preferences";
import { SettingsPanel } from "./SettingsPanel";

const binding = new BindingState();
// "Private" provides custom typing, not encryption or an exemption from Vencord sync/backup.
const settings = definePluginSettings({ controls: { type: OptionType.COMPONENT, component: Settings } })
    .withPrivateSettings<{ preferences?: unknown; }>();
const listeners = new Set<() => void>();
let active = false;
let boundaryError = false;
let saveError = false;
let observerError = false;
let autoReadError = false;
let currentAccount: string | undefined;

const autoReader = new AutoReadController({
    context: autoReadContext,
    defer: callback => FluxDispatcher.wait(() => queueMicrotask(callback)),
    ack: (channelId, messageId) => FluxDispatcher.dispatch({
        type: "CHANNEL_ACK", channelId, messageId, immediate: false, force: false, context: "APP", location: undefined
    }),
    now: () => Date.now(),
    onError: () => {
        if (!autoReadError) {
            autoReadError = true;
            notify();
        }
    }
});

const readers: ContextReaders = {
    accountId: () => AuthenticationStore.getId(),
    channel: id => ChannelStore.getChannel(id),
    roles: (guildId, accountId) => GuildMemberStore.getMember(guildId, accountId)?.roles,
    suppressEveryone: guildId => UserGuildSettingsStore.isSuppressEveryoneEnabled(guildId),
    suppressRoles: guildId => UserGuildSettingsStore.isSuppressRolesEnabled(guildId),
    referencedMessage: (channelId, messageId) => MessageStore.getMessage(channelId, messageId)
};

function notify() {
    for (const listener of listeners) {
        try {
            listener();
        } catch {
            // A failed settings subscriber must not break factory completion or native alerts.
            observerError = true;
            listeners.delete(listener);
        }
    }
}

function setBoundaryError(value: boolean) {
    if (value === boundaryError) return;
    boundaryError = value;
    notify();
}

function bindingStatus() {
    return binding.state(matchesTarget(window.GLOBAL_ENV), wreq?.c[NOTIFICATION_MODULE_ID]);
}

function preferences() {
    const raw = settings.store.preferences;
    return readDocument(raw === undefined ? defaultDocument() : raw);
}

function factoryChanged(_factory: unknown, moduleId: PropertyKey) {
    if (moduleId === NOTIFICATION_MODULE_ID || moduleId === String(NOTIFICATION_MODULE_ID)) {
        if (binding.invalidate(moduleId, wreq?.c[NOTIFICATION_MODULE_ID])) notify();
        return;
    }
}

function accountChanged() {
    const account = AuthenticationStore.getId();
    if (account === currentAccount) return;
    currentAccount = account;
    autoReader.reset();
}

function hasActiveFilters(options: Options): boolean {
    return !options.paused && (options.suppressEveryone || options.suppressPersonal || options.suppressDirectMessages
        || options.suppressReplies || options.suppressRoles);
}

function autoReadContext(message: unknown): AutoReadContext | undefined {
    if (!active || !isPluginEnabled("MentionControl") || bindingStatus() !== "ready"
        || (window as unknown as Record<string, unknown>).__OVERLAY__ !== false) return;
    const saved = preferences();
    if (!saved.ok) return;
    const options = getAccountOptions(saved.document, AuthenticationStore.getId());
    if (!hasActiveFilters(options)) return;
    const context = readContext(message, readers);
    if (!context || !shouldSuppress(message, context, options)) return;
    const channel = ChannelStore.getChannel(context.channelId);
    if (!channel || channel.id !== context.channelId) return;
    // Guild permissions do not describe private channels. Native ACK keeps its own unread gates.
    if (context.scope === "guild" && !PermissionStore.can(PermissionsBits.VIEW_CHANNEL, channel)) return;
    const lastMessageId = ReadStateStore.lastMessageId(context.channelId) ?? undefined;
    const ackMessageId = ReadStateStore.getTrackedAckMessageId(context.channelId);
    if (AuthenticationStore.getId() !== context.accountId) return;
    return { accountId: context.accountId, channelId: context.channelId, scope: context.scope, guildId: context.guildId, lastMessageId, ackMessageId };
}

function save(document: PreferenceDocument) {
    try {
        settings.store.preferences = document;
        saveError = false;
        autoReadError = false;
        autoReader.reset();
    } catch {
        saveError = true;
    }
    notify();
}

function useRuntimeRefresh() {
    const [, refresh] = useState(0);
    useEffect(() => {
        const listener = () => refresh(value => value + 1);
        listeners.add(listener);
        return () => { listeners.delete(listener); };
    }, []);
}

function Settings() {
    settings.use(["preferences"]);
    const account = useStateFromStores([AuthenticationStore], () => AuthenticationStore.getId());
    const accountId = isSnowflake(account) ? account : undefined;
    useRuntimeRefresh();
    const result = preferences();
    const document = result.ok ? result.document : defaultDocument();
    const options = getAccountOptions(document, accountId);
    const change = (next: Options) => {
        const latest = preferences();
        if (!accountId || AuthenticationStore.getId() !== accountId || !latest.ok) return;
        // A stale rendered panel must not overwrite newer choices, even on the same account.
        if (JSON.stringify(getAccountOptions(latest.document, accountId)) !== JSON.stringify(options)) return;
        save(setAccountOptions(latest.document, accountId, next));
    };
    return <>
        {boundaryError && <BaseText tag="p" role="status">Alerts unchanged. Retrying on the next message.</BaseText>}
        {saveError && <BaseText tag="p" role="alert">Could not save. Try again.</BaseText>}
        {observerError && <BaseText tag="p" role="status">Reopen settings.</BaseText>}
        {autoReadError && <BaseText tag="p" role="status">Auto-read failed.</BaseText>}
        <SettingsPanel accountId={accountId} options={options} binding={bindingStatus()} active={active && isPluginEnabled("MentionControl")}
            storageError={!result.ok ? "Settings unavailable. Saved data kept." : undefined}
            onOptionsChange={change}
            onReset={() => change(defaultOptions())} />
    </>;
}

export default definePlugin({
    name: "MentionControl",
    description: "Mute selected messages and mark them read automatically.",
    tags: ["Notifications", "Customisation"],
    authors: [Devs.OwaisByte],
    settings,
    requiresRestart: true,
    patches,
    start() {
        if (active) return;
        active = true;
        currentAccount = AuthenticationStore.getId();
        autoReader.reset();
        AuthenticationStore.addChangeListener(accountChanged);
        factoryListeners.add(factoryChanged);
        notify();
    },
    stop() {
        if (!active) return;
        active = false;
        autoReader.reset();
        AuthenticationStore.removeChangeListener(accountChanged);
        factoryListeners.delete(factoryChanged);
        setBoundaryError(false);
        notify();
    },
    markReady(moduleId: unknown, module: unknown) {
        if (module !== wreq?.c[NOTIFICATION_MODULE_ID]) return;
        if (binding.markReady(moduleId, module)) notify();
    },
    flux: {
        MESSAGE_CREATE(event: unknown) {
            if (!active || !isPluginEnabled("MentionControl")) return;
            try {
                const saved = preferences();
                if (!saved.ok) return;
                const options = getAccountOptions(saved.document, AuthenticationStore.getId());
                if (hasActiveFilters(options)) autoReader.handle(event);
            } catch {
                autoReadError = true;
                notify();
            }
        },
        CONNECTION_OPEN() { autoReader.reset(); },
        CONNECTION_RESUMED() { autoReader.reset(); },
        LOGOUT() { autoReader.reset(); }
    },
    shouldSuppress(message: unknown): boolean {
        try {
            if (!active || !isPluginEnabled("MentionControl") || bindingStatus() !== "ready") return false;
            const saved = preferences();
            if (!saved.ok) return false;
            const accountId = AuthenticationStore.getId();
            const options = getAccountOptions(saved.document, accountId);
            if (!hasActiveFilters(options)) return false;
            const context = readContext(message, readers);
            setBoundaryError(false);
            return Boolean(context && context.accountId === accountId && AuthenticationStore.getId() === accountId
                && shouldSuppress(message, context, options));
        } catch {
            // Never surface native store errors into Discord's message notification handler.
            setBoundaryError(true);
            return false;
        }
    }
});
