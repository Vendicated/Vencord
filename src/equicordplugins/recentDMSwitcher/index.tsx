/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import * as DataStore from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import { EquicordDevs, IS_MAC } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { closeModal, openModal } from "@utils/modal";
import definePlugin, { makeRange, OptionType } from "@utils/types";
import { Button, ChannelRouter, ChannelStore, IconUtils, React, RelationshipStore, SelectedChannelStore, Toasts, UserStore } from "@webpack/common";

const STORAGE_KEY = "RDMSwitch_history";

let rmdsDmChannelIds: string[] = [];
let isCyclingSessionActive = false;
let suppressRdmsWhileCycling = false;
let cycleSnapshot: string[] = [];
let cycleIndex = -1;

const cl = classNameFactory("vc-rdms-");

const settings = definePluginSettings({
    visualStyle: {
        type: OptionType.SELECT,
        description: "Visual indicator style while cycling",
        options: [
            { label: "Overlay (Alt+Tab style)", value: "overlay", default: true },
            { label: "Toast (status message)", value: "toast" },
            { label: "Off", value: "off" }
        ]
    },
    overlayMode: {
        type: OptionType.SELECT,
        description: "Overlay content",
        options: [
            { label: "Row of recent", value: "row", default: true },
            { label: "Current only", value: "current" }
        ]
    },
    amountOfUsers: {
        type: OptionType.SLIDER,
        description: "Number of users to show in overlay",
        markers: makeRange(10, 50, 10),
        stickToMarkers: true,
        default: 20,
    },
    overlayRowLength: {
        type: OptionType.SLIDER,
        description: "Number of recent DMs to show in row",
        markers: [3, 4, 5, 6, 7],
        default: 5
    },
    overlayShowAvatars: {
        type: OptionType.BOOLEAN,
        description: "Show avatars in overlay",
        default: true
    },
    toastDurationMs: {
        type: OptionType.SLIDER,
        description: "Toast hide delay (ms)",
        markers: [300, 500, 600, 800, 1000, 1500, 2000],
        default: 600
    },
    clearRdms: {
        type: OptionType.COMPONENT,
        description: "Testing utility: Clear RDMS list",
        component: () => (
            <Button
                color={Button.Colors.RED}
                onClick={async () => {
                    rmdsDmChannelIds = [];
                    cycleSnapshot = [];
                    cycleIndex = -1;
                    await DataStore.set(STORAGE_KEY, []);
                    Toasts.show({ id: Toasts.genId(), type: Toasts.Type.SUCCESS, message: "Cleared RDMS history" });
                }}>
                "Clear RDMS History
            </Button>
        )
    }
});

let activeToastId: string | null = null;
let overlayModalKey: string | null = null;
let overlayRerender: (() => void) | null = null;

function isDirectMessageChannel(channelId: string | null | undefined): boolean {
    if (!channelId) return false;
    const channel = ChannelStore.getChannel(channelId);
    if (!channel) return false;
    try {
        // Include 1:1 DMs and Group DMs
        return Boolean(channel.isDM() || channel.isGroupDM());
    } catch {
        return false;
    }
}

function pushChannelToFront(channelId: string) {
    rmdsDmChannelIds = rmdsDmChannelIds.filter(id => id !== channelId);
    rmdsDmChannelIds.unshift(channelId);
    if (rmdsDmChannelIds.length > settings.store.amountOfUsers) rmdsDmChannelIds.length = settings.store.amountOfUsers;
    void DataStore.set(STORAGE_KEY, rmdsDmChannelIds);
}

function sanitizeHistory(ids: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const id of ids) {
        if (!id || seen.has(id)) continue;
        if (!ChannelStore.hasChannel(id)) continue;
        if (!isDirectMessageChannel(id)) continue;
        seen.add(id);
        result.push(id);
        if (result.length >= settings.store.amountOfUsers) break;
    }
    return result;
}

function beginCycleSession() {
    if (isCyclingSessionActive) return;
    isCyclingSessionActive = true;
    suppressRdmsWhileCycling = true;

    const currentId = SelectedChannelStore.getChannelId();
    cycleSnapshot = sanitizeHistory([
        ...(isDirectMessageChannel(currentId) ? [currentId!] : []),
        ...rmdsDmChannelIds
    ]);

    cycleIndex = 0;
}

function stepCycle(direction: 1 | -1) {
    if (!isCyclingSessionActive || cycleSnapshot.length === 0) return;
    const total = cycleSnapshot.length;
    if (total <= 1) return;

    cycleIndex = (cycleIndex + direction + total) % total;
    const targetId = cycleSnapshot[cycleIndex];
    if (!targetId || !ChannelStore.hasChannel(targetId)) return;

    const vis = (settings as any).store?.visualStyle;
    if (vis === "overlay") renderOverlay();
    else if (vis === "toast") showCycleToast();
}

function endCycleSession() {
    if (!isCyclingSessionActive) return;
    isCyclingSessionActive = false;
    suppressRdmsWhileCycling = false;

    if (cycleIndex >= 0 && cycleIndex < cycleSnapshot.length) {
        const selected = cycleSnapshot[cycleIndex];
        if (selected) {
            ChannelRouter.transitionToChannel(selected);
            pushChannelToFront(selected);
        }
    }

    cycleSnapshot = [];
    cycleIndex = -1;
    activeToastId = null;

    const visEnd = (settings as any).store?.visualStyle;
    if (visEnd === "overlay") unmountOverlay();
}

function stopEvent(e: KeyboardEvent) {
    try {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
    } catch { }
}

function onKeyDown(e: KeyboardEvent) {
    const hasCtrl = e.ctrlKey || (IS_MAC && e.metaKey);
    if (!hasCtrl) return;

    if (e.key === "Tab") {
        stopEvent(e);
        if (!isCyclingSessionActive) beginCycleSession();
        stepCycle(e.shiftKey ? -1 : 1);
    }
}

function onKeyUp(e: KeyboardEvent) {
    if (e.key === "Control" || (IS_MAC && e.key === "Meta")) {
        stopEvent(e);
        const stillHeld = (e as any).ctrlKey || (e as any).metaKey;
        if (!stillHeld) endCycleSession();
    }
}

function getDisplayForChannel(id: string) {
    const ch = ChannelStore.getChannel(id);
    if (!ch) return {
        name: "Unknown",
        avatar: ""
    };

    if (ch.isDM()) {
        const uid = ch.recipients?.[0];
        const user = uid ? UserStore.getUser(uid) : null;
        const friendNick = user ? RelationshipStore.getNickname(user.id) : null;
        return { name: friendNick ?? user?.globalName ?? user?.username ?? "DM", avatar: user ? IconUtils.getUserAvatarURL(user, true, 64) : "" };
    }

    if (ch.isGroupDM()) {
        return { name: ch.name ?? "Group DM", avatar: IconUtils.getChannelIconURL?.(ch) ?? "" } as any;
    }

    return { name: ch.name ?? "Channel", avatar: "" };
}

function openOverlayModal() {
    if (overlayModalKey) return;
    overlayModalKey = openModal(() => <OverlayContent />);
}

function renderOverlay() {
    if (settings.store.visualStyle !== "overlay") return;
    if (!isCyclingSessionActive) return;
    openOverlayModal();
    overlayRerender?.();
}

function unmountOverlay() {
    if (!overlayModalKey) return;
    closeModal(overlayModalKey);
    overlayModalKey = null;
}

function OverlayContent(): any {
    const [, setTick] = React.useState(0);
    React.useEffect(() => {
        overlayRerender = () => setTick(t => t + 1);
        return () => { overlayRerender = null; };
    }, []);

    const mode = settings.store.overlayMode;
    const showAvatars = settings.store.overlayShowAvatars;
    const maxCount = Math.max(3, Math.min(7, settings.store.overlayRowLength));

    const pageSize = mode === "current" ? 1 : maxCount;
    const visibleList = mode === "current"
        ? [cycleSnapshot[cycleIndex]]
        : cycleSnapshot;

    let pageCount = 1;
    let currentPage = 0;
    if (mode !== "current") {
        pageCount = Math.ceil(visibleList.length / pageSize);
        currentPage = Math.min(pageCount - 1, Math.floor((cycleIndex >= 0 ? cycleIndex : 0) / pageSize));
    }

    const start = currentPage * pageSize;
    const end = Math.min(start + pageSize, visibleList.length);
    const pageItems = visibleList.slice(start, end);

    const cards = pageItems.map(id => {
        const { name, avatar } = getDisplayForChannel(id!);
        const isActive = id === cycleSnapshot[cycleIndex];

        return (
            <div
                key={id}
                className={cl("background")}
                style={{
                    boxShadow: isActive
                        ? "0 0 0 2px var(--brand-500) inset, 0 4px 12px rgba(0,0,0,0.25)"
                        : "0 2px 8px rgba(0,0,0,0.15)",
                }}
            >
                {showAvatars && avatar && (
                    <img alt="" src={avatar} className={cl("avatar")} />
                )}
                <div className={cl("name")}>{name}</div>
            </div>
        );
    });

    const dots =
        pageCount > 1 ? (
            <div className={cl("page-indicator-container")}>
                {Array.from({ length: pageCount }).map((_, i) => (
                    <div
                        key={i}
                        className={cl("page-indicator")}
                        style={{
                            background: i === currentPage ? "var(--brand-500)" : "var(--interactive-muted)",
                            opacity: i === currentPage ? 1 : 0.6,
                        }}
                    />
                ))}
            </div>
        ) : null;

    return (
        <div className={cl("overlay-container")}>
            <div className={cl("cards-container")}>
                <div className={cl("cards")}>
                    {cards}
                </div>
                {dots}
            </div>
        </div>
    );

}

function showCycleToast() {
    if (settings.store.visualStyle !== "toast") return;
    const id = cycleSnapshot[cycleIndex];
    if (!id) return;
    const { name } = getDisplayForChannel(id);
    if (!activeToastId) activeToastId = Toasts.genId();
    Toasts.show({
        id: activeToastId,
        message: `Switching to: ${name}`,
        type: Toasts.Type.MESSAGE,
        options: { position: Toasts.Position.BOTTOM, duration: settings.store.toastDurationMs }
    });
}

export default definePlugin({
    name: "RecentDMSwitcher",
    description: "Ctrl+Tab between most recently used DMs (Ctrl+Shift+Tab reverse)",
    authors: [EquicordDevs.mmeta],
    settings,

    flux: {
        GUILD_SELECT({ guildId }: { guildId: string | null; }) {
            if (!isCyclingSessionActive) return;
            if (guildId) {
                const targetId = cycleSnapshot[cycleIndex];
                if (targetId) ChannelRouter.transitionToChannel(targetId);
            }
        },
        async CHANNEL_SELECT({ channelId }: { channelId: string | null; }) {
            if (suppressRdmsWhileCycling) return;
            if (!channelId) return;
            if (!isDirectMessageChannel(channelId)) return;
            pushChannelToFront(channelId);
        }
    },

    async start() {
        const saved = await DataStore.get<string[]>(STORAGE_KEY);
        rmdsDmChannelIds = Array.isArray(saved) ? sanitizeHistory(saved) : [];

        const current = SelectedChannelStore.getChannelId();
        if (isDirectMessageChannel(current)) pushChannelToFront(current!);

        document.addEventListener("keydown", onKeyDown, true);
        document.addEventListener("keyup", onKeyUp, true);
    },

    stop() {
        document.removeEventListener("keydown", onKeyDown, true);
        document.removeEventListener("keyup", onKeyUp, true);
        isCyclingSessionActive = false;
        suppressRdmsWhileCycling = false;
        cycleSnapshot = [];
        cycleIndex = -1;
        activeToastId = null;

        const visEnd = (settings as any).store?.visualStyle;
        if (visEnd === "overlay") unmountOverlay();
    }
});
