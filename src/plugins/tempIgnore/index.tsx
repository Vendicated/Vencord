/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import {
    Menu,
    FluxDispatcher,
    showToast,
    Toasts,
    ChannelStore,
    UserStore,
    RelationshipStore,
    VoiceStateStore,
    PresenceStore
} from "@webpack/common";

import { openTempIgnoreModal } from "./TempIgnoreModal";
import { TempIgnoreSettingsPanel } from "./TempIgnoreSettings";
import {
    settings,
    loadIgnoredUsers,
    isIgnored,
    removeIgnoredUser,
    cleanupExpired,
    getAllIgnoredUsers,
    getTimeRemaining,
} from "./store";

// ── Expiry check interval handle ──
let expiryInterval: ReturnType<typeof setInterval> | null = null;

// ── Style Element for message hiding ──
let styleElement: HTMLStyleElement | null = null;

// ── Store load check interval handle ──
let storeCheckInterval: ReturnType<typeof setInterval> | null = null;

// ── Context Menu: User Context ──
const userContextPatch: NavContextMenuPatchCallback = (children, { user }: { user?: { id: string | bigint; username: string }; }) => {
    if (!user) return;

    let isSelf = false;
    const userId = String(user.id);
    try {
        const currentUser = UserStore?.getCurrentUser();
        if (currentUser && userId === String(currentUser.id)) {
            isSelf = true;
        }
    } catch {}
    if (isSelf) return;

    let ignored = false;
    try {
        ignored = isIgnored(userId);
    } catch (e) {
        console.error("[TempIgnore] Failed to check ignore status in context menu:", e);
    }

    let remainingText = "";
    try {
        if (ignored) {
            remainingText = getTimeRemaining(userId);
        }
    } catch {}

    children.push(
        <Menu.MenuGroup>
            {ignored ? (
                <Menu.MenuItem
                    id="vc-temp-ignore-remove"
                    label={`⏱ Unignore (${remainingText})`}
                    action={() => {
                        try {
                            removeIgnoredUser(userId);
                            showToast(`Unignored ${user.username}`, Toasts.Type.SUCCESS);
                        } catch (e) {
                            console.error("[TempIgnore] Failed to unignore user:", e);
                        }
                    }}
                />
            ) : (
                <Menu.MenuItem
                    id="vc-temp-ignore-add"
                    label="⏱ Temp Ignore"
                    action={() => {
                        try {
                            openTempIgnoreModal(userId, user.username);
                        } catch (e) {
                            console.error("[TempIgnore] Failed to open modal:", e);
                        }
                    }}
                />
            )}
        </Menu.MenuGroup>
    );
};

// ── CSS Injection for Hiding Messages ──

function updateIgnoredUsersCSS() {
    if (!settings.store.hideMessages) {
        if (styleElement) {
            styleElement.remove();
            styleElement = null;
        }
        return;
    }

    const ignoredUsers = getAllIgnoredUsers();
    const userIds = Object.keys(ignoredUsers).filter(id => isIgnored(id));

    if (userIds.length === 0) {
        if (styleElement) {
            styleElement.remove();
            styleElement = null;
        }
        return;
    }

    const selectors = userIds.map(id => `[data-author-id="${id}"]`).join(",\n");
    const css = `${selectors} { display: none !important; }`;

    if (!styleElement) {
        styleElement = document.createElement("style");
        styleElement.id = "vc-temp-ignore-styles";
        document.head.appendChild(styleElement);
    }
    styleElement.textContent = css;
}

// ── Flux Dispatch Handlers ──

function handleLoadMessages(event: any) {
    if (!settings.store.hideMessages) return;
    if (!event.messages) return;

    event.messages = event.messages.filter(
        (msg: any) => !isIgnored(msg.author?.id)
    );
}

function handleMessageCreate(event: any) {
    if (!settings.store.hideMessages) return;
    if (!event.message?.author?.id) return;

    if (isIgnored(event.message.author.id)) {
        event.optimistic = true;
        event.sendMessageOptions = {};
        event.message.__tempIgnored = true;
    }
}

function handlePresenceUpdates(event: any) {
    if (!settings.store.hidePresence) return;
    if (!event.updates) return;

    event.updates = event.updates.filter(
        (update: any) => !isIgnored(update.user?.id)
    );
}

// ── Store Overrides (Monkey patching) ──

const originalStoreMethods: Record<string, Record<string, any>> = {
    RelationshipStore: {},
    ChannelStore: {},
    VoiceStateStore: {},
    PresenceStore: {}
};

function overrideStoreMethod(storeKey: string, store: any, methodName: string, overrideFn: Function) {
    if (!store) return;
    try {
        const originalFn = store[methodName];
        if (typeof originalFn !== "function") return;

        originalStoreMethods[storeKey][methodName] = originalFn;

        // Wrap in try-catch so any error in our override falls back to original
        const safeOverride = function(this: any) {
            try {
                return overrideFn.apply(this, arguments);
            } catch (e) {
                console.error(`[TempIgnore] Override ${storeKey}.${methodName} errored, falling back:`, e);
                return originalFn.apply(this, arguments);
            }
        };

        Object.defineProperty(store, methodName, {
            value: safeOverride,
            writable: true,
            configurable: true
        });
    } catch (e) {
        console.error(`[TempIgnore] Failed to override ${methodName} on ${storeKey}:`, e);
    }
}

function restoreStoreMethods() {
    const storesMap: Record<string, any> = {
        RelationshipStore,
        ChannelStore,
        VoiceStateStore,
        PresenceStore
    };
    for (const [storeKey, methods] of Object.entries(originalStoreMethods)) {
        const store = storesMap[storeKey];
        if (!store) continue;
        for (const [methodName, originalFn] of Object.entries(methods)) {
            try {
                Object.defineProperty(store, methodName, {
                    value: originalFn,
                    writable: true,
                    configurable: true
                });
            } catch (e) {
                store[methodName] = originalFn;
            }
        }
        originalStoreMethods[storeKey] = {};
    }
}

function applyStoreOverrides() {
    if (!RelationshipStore || !ChannelStore || !VoiceStateStore || !PresenceStore) {
        return;
    }

    // 1. RelationshipStore overrides (hiding from Friend List)
    overrideStoreMethod("RelationshipStore", RelationshipStore, "getFriendIDs", function(this: any) {
        const ids = originalStoreMethods.RelationshipStore.getFriendIDs.apply(this, arguments);
        if (!settings.store.hideFriendList) return ids;
        return ids.filter((id: string) => !isIgnored(id));
    });

    overrideStoreMethod("RelationshipStore", RelationshipStore, "getMutableRelationships", function(this: any) {
        const rels = originalStoreMethods.RelationshipStore.getMutableRelationships.apply(this, arguments);
        if (!settings.store.hideFriendList) return rels;
        if (rels instanceof Map) {
            const copy = new Map(rels);
            for (const userId of copy.keys()) {
                if (isIgnored(userId)) {
                    copy.delete(userId);
                }
            }
            return copy;
        } else if (rels && typeof rels === "object") {
            const copy = { ...rels };
            for (const userId in copy) {
                if (isIgnored(userId)) {
                    delete copy[userId];
                }
            }
            return copy;
        }
        return rels;
    });

    overrideStoreMethod("RelationshipStore", RelationshipStore, "isFriend", function(this: any, userId: string) {
        if (settings.store.hideFriendList && isIgnored(userId)) return false;
        return originalStoreMethods.RelationshipStore.isFriend.apply(this, arguments);
    });

    overrideStoreMethod("RelationshipStore", RelationshipStore, "getRelationshipType", function(this: any, userId: string) {
        if (settings.store.hideFriendList && isIgnored(userId)) return 0; // RelationshipType.NONE = 0
        return originalStoreMethods.RelationshipStore.getRelationshipType.apply(this, arguments);
    });

    // 2. ChannelStore overrides (hiding from DM list)
    overrideStoreMethod("ChannelStore", ChannelStore, "getSortedPrivateChannels", function(this: any) {
        const channels = originalStoreMethods.ChannelStore.getSortedPrivateChannels.apply(this, arguments);
        if (!settings.store.hideDMs) return channels;
        return channels.filter((channel: any) => {
            if (channel.type === 1) { // DM channel
                const recipientId = channel.recipients?.[0] || channel.recipient_id;
                if (recipientId && isIgnored(recipientId)) return false;
            }
            return true;
        });
    });

    overrideStoreMethod("ChannelStore", ChannelStore, "getMutablePrivateChannels", function(this: any) {
        const channels = originalStoreMethods.ChannelStore.getMutablePrivateChannels.apply(this, arguments);
        if (!settings.store.hideDMs) return channels;
        const copy = { ...channels };
        for (const channelId in copy) {
            const channel = copy[channelId];
            if (channel && channel.type === 1) {
                const recipientId = channel.recipients?.[0] || channel.recipient_id;
                if (recipientId && isIgnored(recipientId)) {
                    delete copy[channelId];
                }
            }
        }
        return copy;
    });

    // 3. VoiceStateStore overrides (hiding from Voice Channels)
    // getVoiceStates(guildId?) returns UserVoiceStateRecords = Record<userId, VoiceState>
    overrideStoreMethod("VoiceStateStore", VoiceStateStore, "getVoiceStates", function(this: any) {
        const states = originalStoreMethods.VoiceStateStore.getVoiceStates.apply(this, arguments);
        if (!settings.store.hideVoice) return states;
        if (!states || typeof states !== "object") return states;
        // Filter out ignored users from the flat userId->VoiceState record
        const filtered: any = {};
        for (const key in states) {
            const voiceState = states[key];
            const userId = voiceState?.userId ?? key;
            if (!isIgnored(userId)) {
                filtered[key] = voiceState;
            }
        }
        return filtered;
    });

    // getVoiceStatesForChannel(channelId) returns UserVoiceStateRecords
    overrideStoreMethod("VoiceStateStore", VoiceStateStore, "getVoiceStatesForChannel", function(this: any) {
        const states = originalStoreMethods.VoiceStateStore.getVoiceStatesForChannel.apply(this, arguments);
        if (!settings.store.hideVoice) return states;
        if (!states || typeof states !== "object") return states;
        const filtered: any = {};
        for (const key in states) {
            const voiceState = states[key];
            const userId = voiceState?.userId ?? key;
            if (!isIgnored(userId)) {
                filtered[key] = voiceState;
            }
        }
        return filtered;
    });

    // getVoiceStateForUser(userId) returns VoiceState | undefined
    overrideStoreMethod("VoiceStateStore", VoiceStateStore, "getVoiceStateForUser", function(this: any, userId: string) {
        if (settings.store.hideVoice && isIgnored(userId)) return undefined;
        return originalStoreMethods.VoiceStateStore.getVoiceStateForUser.apply(this, arguments);
    });

    // 4. PresenceStore overrides (hiding Presence/Status)
    overrideStoreMethod("PresenceStore", PresenceStore, "getStatus", function(this: any, userId: string) {
        if (settings.store.hidePresence && isIgnored(userId)) return "offline";
        return originalStoreMethods.PresenceStore.getStatus.apply(this, arguments);
    });

    overrideStoreMethod("PresenceStore", PresenceStore, "getActivities", function(this: any, userId: string) {
        if (settings.store.hidePresence && isIgnored(userId)) return [];
        return originalStoreMethods.PresenceStore.getActivities.apply(this, arguments);
    });

    overrideStoreMethod("PresenceStore", PresenceStore, "getPrimaryActivity", function(this: any, userId: string) {
        if (settings.store.hidePresence && isIgnored(userId)) return null;
        return originalStoreMethods.PresenceStore.getPrimaryActivity.apply(this, arguments);
    });
}

function emitAllStoreChanges() {
    try { RelationshipStore?.emitChange(); } catch {}
    try { ChannelStore?.emitChange(); } catch {}
    try { VoiceStateStore?.emitChange(); } catch {}
    try { PresenceStore?.emitChange(); } catch {}
}

// ── Expiry Checker ──

function startExpiryTimer() {
    expiryInterval = setInterval(() => {
        const expired = cleanupExpired();
        if (expired.length > 0) {
            if (settings.store.showExpiryToast) {
                for (const username of expired) {
                    showToast(
                        `⏱ Temp-ignore expired for ${username}`,
                        Toasts.Type.MESSAGE
                    );
                }
            }
            updateIgnoredUsersCSS();
            emitAllStoreChanges();
        }
    }, 10_000); // Check every 10 seconds for faster updates
}

function stopExpiryTimer() {
    if (expiryInterval !== null) {
        clearInterval(expiryInterval);
        expiryInterval = null;
    }
}

// ── Plugin Definition ──

export default definePlugin({
    name: "TempIgnore",
    description: "Temporarily ignore a user for a set duration — hides their messages, DMs, status, friend list entry, and voice presence. Auto-reverts when the timer expires.",
    authors: [{
        name: "Senku",
        id: 1113849467695792140n
    }],
    settings,
    settingsAboutComponent: TempIgnoreSettingsPanel,

    contextMenus: {
        "user-context": userContextPatch,
    },

    start() {
        loadIgnoredUsers();

        // Subscriptions
        FluxDispatcher.subscribe("LOAD_MESSAGES_SUCCESS", handleLoadMessages);
        FluxDispatcher.subscribe("MESSAGE_CREATE", handleMessageCreate);
        FluxDispatcher.subscribe("PRESENCE_UPDATES", handlePresenceUpdates);

        // Periodically check if stores are ready, then apply overrides
        storeCheckInterval = setInterval(() => {
            if (RelationshipStore && ChannelStore && VoiceStateStore && PresenceStore) {
                clearInterval(storeCheckInterval!);
                storeCheckInterval = null;

                applyStoreOverrides();
                updateIgnoredUsersCSS();
                emitAllStoreChanges();
            }
        }, 50);

        startExpiryTimer();
    },

    stop() {
        FluxDispatcher.unsubscribe("LOAD_MESSAGES_SUCCESS", handleLoadMessages);
        FluxDispatcher.unsubscribe("MESSAGE_CREATE", handleMessageCreate);
        FluxDispatcher.unsubscribe("PRESENCE_UPDATES", handlePresenceUpdates);

        if (storeCheckInterval !== null) {
            clearInterval(storeCheckInterval);
            storeCheckInterval = null;
        }

        restoreStoreMethods();

        if (styleElement) {
            styleElement.remove();
            styleElement = null;
        }

        emitAllStoreChanges();
        stopExpiryTimer();
    },
});
