/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addGlobalContextMenuPatch, findGroupChildrenByChildId, GlobalContextMenuPatchCallback, NavContextMenuPatchCallback, removeGlobalContextMenuPatch } from "@api/ContextMenu";
import * as DataStore from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { confirmAction } from "@utils/discord";
import { Logger } from "@utils/Logger";
import { sleep } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { Menu, RestAPI, showToast, UserStore, useState } from "@webpack/common";
import type { ReactElement } from "react";

import { Native } from "./bridge";
import { openGallery } from "./Gallery";
import { watchAvatarResources } from "./watch";

const logger = new Logger("PfpWatcher");
const settings = definePluginSettings({
    showWatchMenu: {
        type: OptionType.BOOLEAN,
        description: "Show Watch this user / Stop watching in user right-click menus.",
        default: true
    },
    showSavePfpMenu: {
        displayName: "Show Save PFP menu",
        type: OptionType.BOOLEAN,
        description: "Show Save PFP in user right-click menus. Saves once without adding the user to automatic watching.",
        default: true
    },
    showGalleryMenu: {
        displayName: "Show user gallery menu",
        type: OptionType.BOOLEAN,
        description: "Show Open this user's PFPs in the PFPWatcher user submenu.",
        default: true
    },
    notifyAvatarChanges: {
        type: OptionType.BOOLEAN,
        description: "Show an in-app notification when a tracked user's avatar changes after their initial collection.",
        default: false
    },
    autoCleanup: {
        type: OptionType.BOOLEAN,
        description: "Delete the oldest collected pictures after saving a new picture when the archive exceeds the limit. Deletion is permanent.",
        default: false
    },
    maxSavedAvatars: {
        type: OptionType.NUMBER,
        description: "Maximum pictures across the entire archive when automatic cleanup is enabled (1–100000). Applied on the next save.",
        default: 1000,
        min: 1,
        max: 100000,
        isValid: value => {
            const number = typeof value === "number" ? value : typeof value === "string" && /^\d+$/.test(value.trim()) ? Number(value) : NaN;
            return Number.isInteger(number) && number >= 1 && number <= 100000 || "Enter a whole number from 1 to 100000.";
        }
    },
    users: {
        type: OptionType.STRING,
        description: "Usernames or user IDs to track, separated by commas (no display names).",
        default: ""
    },
    folder: {
        type: OptionType.STRING,
        description: "Absolute path to your pfp folder. Leave blank for Documents/pfp.",
        default: ""
    },
    collectEvery30Minutes: {
        displayName: "Automatic checks",
        type: OptionType.BOOLEAN,
        description: "Check for new profile pictures at your chosen interval while Discord is open.",
        default: false,
        onChange: (value: boolean) => configureCollectionTimer(value)
    },
    checkIntervalMinutes: {
        displayName: "Check interval (minutes)",
        type: OptionType.NUMBER,
        description: "Minutes between automatic checks (1–1440). Changes restart the timer.",
        default: 30,
        min: 1,
        max: 1440,
        isValid: value => {
            // Vencord's number input validates text before converting it to a number.
            const number = typeof value === "number" ? value : typeof value === "string" && /^\d+$/.test(value.trim()) ? Number(value) : NaN;
            return Number.isInteger(number) && number >= 1 && number <= 1440 || "Enter a whole number from 1 to 1440.";
        },
        onChange: () => configureCollectionTimer(settings.store.collectEvery30Minutes)
    },
    collectOnDiscordLoad: {
        displayName: "Save avatars when Discord loads them",
        type: OptionType.BOOLEAN,
        description: "Save new global avatars for tracked users when Discord loads an image or receives a user update. DevTools can stay closed.",
        default: true,
        onChange: () => configureAvatarWatcher()
    }
});

let enabled = false;
let startupChecked = false;
let running: Promise<string> | undefined;
let runningSession = 0;
let collectionTimer: ReturnType<typeof setInterval> | undefined;
let session = 0;
let stopWatching: (() => void) | undefined;
let observedQueue: Promise<void> = Promise.resolve();
const observed = new Set<string>();
let rememberedUsers: Record<string, string> = {};
let rememberedLoad: Promise<Record<string, string>> | undefined;
let identitiesDirty = false;
let trackingSource: string | undefined;
let trackingEntries: string[] = [];
let trackedIds = new Set<string>();
let trackedNames = new Set<string>();
const lastAvatars = new Map<string, string | undefined>();
let saveQueue: Promise<unknown> = Promise.resolve();

function loadRememberedUsers() {
    if (!rememberedLoad) {
        const loadingSession = session;
        rememberedLoad = DataStore.get<Record<string, string>>("PfpWatcher.users").then(data => {
            const remembered: Record<string, string> = Object.assign(Object.create(null), data);
            if (session === loadingSession) { rememberedUsers = remembered; trackingSource = undefined; }
            return remembered;
        }).catch(error => { if (session === loadingSession) rememberedLoad = undefined; throw error; });
    }
    return rememberedLoad;
}

function trackedEntries() {
    if (trackingSource !== settings.store.users) {
        trackingSource = settings.store.users;
        trackingEntries = [...new Set(trackingSource.split(/[,\n]/).map(s => s.trim().replace(/^@/, "")).filter(Boolean))];
        trackedIds = new Set<string>();
        trackedNames = new Set<string>();
        for (const entry of trackingEntries) {
            if (/^\d{17,20}$/.test(entry)) trackedIds.add(entry);
            else if (rememberedUsers[entry]) trackedIds.add(rememberedUsers[entry]);
            else trackedNames.add(entry.toLowerCase());
        }
    }
    return trackingEntries;
}

function isWatching(id: string, username?: string) {
    trackedEntries();
    return trackedIds.has(id) || Boolean(username && trackedNames.has(username.toLowerCase()));
}

async function cleanupArchive(folder: string, currentSession: number) {
    if (!enabled || session !== currentSession || settings.store.folder !== folder || !settings.store.autoCleanup) return;
    try { await Native.pruneAvatars(folder, settings.store.maxSavedAvatars); }
    catch (error) { logger.error("Archive cleanup failed", error); }
}

function saveTrackedAvatar(folder: string, id: string, hash: string, username: string, currentSession: number, tracked = true, saveCopy = false, deferCleanup = false) {
    const task = saveQueue.catch(() => {}).then(async () => {
        const canceled = () => !enabled || session !== currentSession || settings.store.folder !== folder
            || (tracked && !isWatching(id, username));
        if (canceled()) return { saved: false };
        const key = `PfpWatcher.lastAvatar:${folder}:${id}`;
        if (tracked && !lastAvatars.has(key)) {
            const previous = await DataStore.get<string>(key);
            if (canceled()) return { saved: false };
            lastAvatars.set(key, previous);
        }
        const previous = tracked ? lastAvatars.get(key) : undefined;
        if (canceled()) return { saved: false };
        const result = await Native.saveAvatar(folder, id, hash, username, saveCopy);
        if (canceled()) return result;
        if (tracked && previous !== hash) { await DataStore.set(key, hash); lastAvatars.set(key, hash); }
        if (previous && previous !== hash && enabled && session === currentSession && settings.store.notifyAvatarChanges)
            showToast({ text: `PfpWatcher: ${username || id} changed their avatar.` });
        if (result.saved && !deferCleanup) await cleanupArchive(folder, currentSession);
        return result;
    });
    saveQueue = task;
    return task;
}

const userContextMenu: NavContextMenuPatchCallback = (children, { user }) => {
    if (!enabled || !user || !/^\d{17,20}$/.test(user.id)) return;
    const items: ReactElement[] = [];
    if (settings.store.showSavePfpMenu) items.push(<Menu.MenuItem id="pfp-watcher-save" label="Save PFP" action={async () => {
        if (!enabled || !settings.store.showSavePfpMenu) return;
        const currentSession = session;
        const { folder } = settings.store;
        try {
            const { body } = await RestAPI.get({ url: `/users/${user.id}` });
            if (!enabled || session !== currentSession) return;
            if (body.id !== user.id) throw new Error("Unexpected user response");
            if (!body.avatar) {
                showToast({ text: "PfpWatcher: This user has no custom avatar to save." });
                return;
            }
            const active = () => enabled && session === currentSession && settings.store.folder === folder && settings.store.showSavePfpMenu;
            const confirmCopy = () => confirmAction({
                title: "PFP already saved",
                subtitle: `This profile picture for ${body.username || user.id} is already in your collection. Continue anyway to download an additional copy without overwriting existing files. Your optional archive cleanup limit still applies.`,
                confirmText: "Continue anyway",
                cancelText: "Cancel"
            });
            let saveCopy = await Native.hasAvatar(folder, user.id, body.avatar);
            if (!active()) return;
            if (saveCopy && !await confirmCopy()) return;
            if (!active()) return;
            let result = await saveTrackedAvatar(folder, user.id, body.avatar, body.username, currentSession, false, saveCopy);
            // A concurrent automatic save may have archived it since the existence check.
            if (!result.saved && !saveCopy && active()) {
                if (!await confirmCopy() || !active()) return;
                saveCopy = true;
                result = await saveTrackedAvatar(folder, user.id, body.avatar, body.username, currentSession, false, true);
            }
            if (!active()) return;
            showToast({ text: `PfpWatcher: ${saveCopy ? "Saved an additional PFP copy for" : "Saved PFP for"} ${body.username || user.id}.` });
        } catch (error) {
            logger.error("Could not save PFP", error);
            showToast({ text: `PfpWatcher: Could not save PFP. ${String(error)}`, variant: "critical" });
        }
    }} />);
    if (settings.store.showGalleryMenu) items.push(<Menu.MenuItem id="pfp-watcher-user-gallery" label="Open this user's PFPs" action={() => {
        if (enabled && settings.store.showGalleryMenu) openGallery(settings.store.folder, user.id);
    }} />);
    const watching = isWatching(user.id, user.username);
    const setWatching = async (add: boolean) => {
        if (!enabled || !settings.store.showWatchMenu) return;
        const currentSession = session;
        try {
            const remembered = await loadRememberedUsers();
            if (!enabled || session !== currentSession || !settings.store.showWatchMenu) return;
            rememberedUsers = remembered;
            const entries = trackedEntries();
            const matches = (entry: string) => entry === user.id || (remembered[entry] ? remembered[entry] === user.id
                : entry.toLowerCase() === user.username?.toLowerCase());
            const watching = entries.some(matches);
            if (add === watching) return;
            settings.store.users = (add ? [...entries, user.id] : entries.filter(entry => !matches(entry))).join(", ");
            observed.clear();
            showToast({ text: `PfpWatcher: ${add ? "Now watching" : "Stopped watching"} ${user.username || user.id}.` });
            if (add) {
                // A current scan uses a snapshot; wait before checking the updated list.
                if (running) await running.catch(() => {});
                if (enabled && session === currentSession) await checkNow();
            }
        } catch (error) {
            logger.error("Could not update watched users", error);
            showToast({ text: "PfpWatcher: Could not update watched users.", variant: "critical" });
        }
    };
    if (settings.store.showWatchMenu) {
        if (watching) items.push(<Menu.MenuItem id="pfp-watcher-unwatch" label="Stop watching this user" action={() => setWatching(false)} />);
        else items.push(<Menu.MenuItem id="pfp-watcher-watch" label="Watch this user" action={() => setWatching(true)} />);
    }
    if (!items.length) return;
    const submenu = <Menu.MenuItem id="pfp-watcher-context" label="PFPWatcher">{items}</Menu.MenuItem>;
    const group = findGroupChildrenByChildId("vc-copy-user-url", children);
    if (group) group.splice(group.findIndex(item => item?.props?.id === "vc-copy-user-url") + 1, 0, submenu);
    else children.push(submenu);
};

// Global patches run after named-menu patches, including CopyUserURLs.
const userContextMenuPatch: GlobalContextMenuPatchCallback = (navId, children, ...args) => {
    if (navId === "user-context" && args[0]?.user) userContextMenu(children, ...args);
};

async function collectObservedAvatar(id: string, hash: string, username?: string) {
    if (!enabled || !settings.store.collectOnDiscordLoad || !UserStore.getCurrentUser()) return;
    if (!/^\d{17,20}$/.test(id) || !/^(?:a_)?[a-f0-9]{32}$/.test(hash)) return;
    const currentSession = session;
    const { folder } = settings.store;
    const key = `${currentSession}:${folder}:${id}:${hash}`;
    if (observed.has(key)) return;
    await loadRememberedUsers();
    if (!enabled || session !== currentSession || !settings.store.collectOnDiscordLoad || settings.store.folder !== folder) return;
    const user = UserStore.getUser(id);
    if (!isWatching(id, user?.username)) return;
    if (observed.has(key)) return;
    observed.add(key);
    observedQueue = observedQueue.catch(() => {}).then(async () => {
        if (!enabled || session !== currentSession || !settings.store.collectOnDiscordLoad || settings.store.folder !== folder) {
            observed.delete(key);
            return;
        }
        try {
            const result = await saveTrackedAvatar(folder, id, hash, username ?? user?.username ?? "", currentSession);
            if (result.saved) logger.info(`Saved observed avatar for ${id}`);
        } catch (error) {
            observed.delete(key);
            logger.error(`Could not save observed avatar for ${id}`, error);
        }
        // Bound session memory; native disk deduplication still prevents duplicate files.
        if (observed.size > 2048) observed.delete(observed.values().next().value!);
    });
    await observedQueue;
}

function observeAvatar(id: string, hash: string, username?: string) {
    void collectObservedAvatar(id, hash, username).catch(error => logger.error("Avatar observation failed", error));
}

function configureAvatarWatcher() {
    stopWatching?.();
    stopWatching = undefined;
    if (enabled && settings.store.collectOnDiscordLoad) {
        try { stopWatching = watchAvatarResources(observeAvatar); }
        catch (error) { logger.error("Could not watch Chromium avatar resources", error); }
    }
}

async function checkUsers() {
    const checkSession = session;
    const { folder } = settings.store;
    const remembered = await loadRememberedUsers();
    const entries = [...trackedEntries()];
    let saved = 0;
    let existing = 0;
    let missing = 0;
    const failures: string[] = [];
    const checkedIds = new Set<string>();
    for (const entry of entries) {
        if (!enabled || checkSession !== session) break;
        try {
            let id = /^\d{17,20}$/.test(entry) ? entry : remembered[entry];
            if (!id) {
                const matches = Object.values(UserStore.getUsers()).filter(u => u.username.toLowerCase() === entry.toLowerCase());
                if (matches.length !== 1) throw new Error("Username not found or ambiguous; open their profile first, or use their user ID.");
                id = matches[0].id;
            }
            // Aliases and an explicit ID may resolve to the same account.
            if (checkedIds.has(id)) continue;
            checkedIds.add(id);
            // Fetch fresh data: the user store may still contain yesterday's avatar.
            const { body } = await RestAPI.get({ url: `/users/${id}` });
            if (body.id !== id) throw new Error("Unexpected user response");
            if (remembered[entry] !== id) { remembered[entry] = id; trackingSource = undefined; identitiesDirty = true; }
            if (!enabled || checkSession !== session) break;
            if (!body.avatar) {
                missing++;
            } else {
                const result = await saveTrackedAvatar(folder, id, body.avatar, body.username, checkSession, true, false, true);
                if (result.saved) saved++;
                else existing++;
            }
        } catch (error) {
            failures.push(`${entry}: ${String(error)}`);
            logger.error(`Could not check ${entry}`, error);
        }
        await sleep(1000);
    }
    if (identitiesDirty && enabled && session === checkSession) { await DataStore.set("PfpWatcher.users", remembered); identitiesDirty = false; }
    if (saved) {
        const cleanup = saveQueue.catch(() => {}).then(() => cleanupArchive(folder, checkSession));
        saveQueue = cleanup;
        await cleanup;
    }
    return `${saved} saved, ${existing} already saved, ${missing} without a custom avatar.${failures.length ? ` Errors: ${failures.join("; ")}` : ""}`;
}

function checkNow() {
    if (!enabled) return Promise.resolve("Enable PfpWatcher to collect avatars.");
    if (running && runningSession !== session) {
        const requestedSession = session;
        return running.catch(() => {}).then(() => requestedSession === session ? checkNow() : "Check canceled.");
    }
    if (running) return running;
    runningSession = session;
    return running = checkUsers().finally(() => { running = undefined; });
}

function configureCollectionTimer(collectEvery30Minutes: boolean) {
    if (collectionTimer !== undefined) clearInterval(collectionTimer);
    collectionTimer = undefined;
    if (!enabled || !collectEvery30Minutes) return;
    collectionTimer = setInterval(() => {
        if (!enabled || !settings.store.collectEvery30Minutes || !UserStore.getCurrentUser()) return;
        void checkNow().then(result => logger.info(result)).catch(error => logger.error("Scheduled check failed", error));
    }, Math.min(1440, Math.max(1, Math.trunc(settings.store.checkIntervalMinutes || 30))) * 60 * 1000);
}

function startupCheck() {
    if (!enabled || startupChecked || !UserStore.getCurrentUser()) return;
    startupChecked = true;
    void checkNow().then(result => logger.info(result)).catch(error => {
        startupChecked = false;
        logger.error("Startup check failed", error);
    });
}

export default definePlugin({
    name: "PfpWatcher",
    description: "Collect tracked users' avatars at startup, on a schedule, or when Discord loads them.",
    authors: [Devs.NotJacobWasHere],
    dependencies: ["VencordToolbox"],
    settings,
    toolboxActions() {
        return <Menu.MenuItem id="pfp-watcher-menu" label="PfpWatcher">
            <Menu.MenuItem id="pfp-watcher-rescan" label="Rescan tracked users" action={() => {
                showToast({ text: "Checking tracked users’ avatars…" });
                void checkNow().then(text => showToast({ text }))
                    .catch(error => showToast({ text: `PfpWatcher: ${String(error)}`, variant: "critical" }));
            }} />
            <Menu.MenuItem id="pfp-watcher-gallery" label="Open gallery" action={() => openGallery(settings.store.folder)} />
        </Menu.MenuItem>;
    },
    start() {
        enabled = true;
        session++;
        rememberedLoad = undefined;
        rememberedUsers = {};
        identitiesDirty = false;
        trackingSource = undefined;
        lastAvatars.clear();
        addGlobalContextMenuPatch(userContextMenuPatch);
        configureAvatarWatcher();
        configureCollectionTimer(settings.store.collectEvery30Minutes);
        startupChecked = false;
        startupCheck();
    },
    stop() {
        enabled = false;
        removeGlobalContextMenuPatch(userContextMenuPatch);
        session++;
        configureCollectionTimer(false);
        configureAvatarWatcher();
        observed.clear();
    },
    flux: {
        CONNECTION_OPEN: startupCheck,
        USER_UPDATE({ user }) {
            if (user?.id && user.avatar) observeAvatar(user.id, user.avatar, user.username);
        }
    },
    settingsAboutComponent: ErrorBoundary.wrap(() => {
        const [status, setStatus] = useState("");
        const [busy, setBusy] = useState(false);
        return <div>
            <p>Checks at startup and optionally at your chosen interval. Live collection saves tracked users' avatars when Discord loads them; DevTools can stay closed. Changes Discord never receives cannot be detected. Usernames resolve from users your client knows; IDs work directly.</p>
            <div className="vc-pfp-actions">
                <Button onClick={() => openGallery(settings.store.folder)}>Browse collected pfps</Button>
                <Button disabled={busy} onClick={async () => {
                    setBusy(true);
                    try { setStatus(await checkNow()); }
                    catch (error) { setStatus(String(error)); }
                    finally { setBusy(false); }
                }}>Check now</Button>
                <Button onClick={() => { void Native.openFolder(settings.store.folder).catch(error => setStatus(String(error))); }}>Open pfp folder</Button>
            </div>
            <p role="status" style={{ overflowWrap: "anywhere" }}>{status}</p>
        </div>;
    }, { noop: false })
});
