/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { getUserSettingLazy } from "@api/UserSettings";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";

type DiscordStatus = "online" | "idle" | "dnd" | "invisible";
type StatusOption = DiscordStatus | "none";
type PriorityOrder =
    | "game_music_watching"
    | "game_watching_music"
    | "music_game_watching"
    | "music_watching_game"
    | "watching_game_music"
    | "watching_music_game";

type ActivityLike = {
    type?: number;
};

const ActivityStore = findByPropsLazy("getActivities", "findActivity");
const UserStore = findByPropsLazy("getCurrentUser", "getUser");
const StatusSettings = getUserSettingLazy<string>("status", "status")!;

function toDiscordStatus(value: StatusOption): DiscordStatus | null {
    return value === "none" ? null : value;
}

function getPrioritySequence(order: PriorityOrder): Array<"game" | "music" | "watching"> {
    switch (order) {
        case "game_watching_music":
            return ["game", "watching", "music"];
        case "music_game_watching":
            return ["music", "game", "watching"];
        case "music_watching_game":
            return ["music", "watching", "game"];
        case "watching_game_music":
            return ["watching", "game", "music"];
        case "watching_music_game":
            return ["watching", "music", "game"];
        case "game_music_watching":
        default:
            return ["game", "music", "watching"];
    }
}

function getCurrentStatus(): DiscordStatus {
    const status = StatusSettings.getSetting();

    if (status === "online" || status === "idle" || status === "dnd" || status === "invisible") {
        return status;
    }

    return "online";
}

function setStatus(status: DiscordStatus) {
    StatusSettings.updateSetting(status);
}

function getActivities(): ActivityLike[] {
    const currentUserId = UserStore?.getCurrentUser?.()?.id;

    if (!currentUserId) return [];

    const list = ActivityStore?.getActivities?.(currentUserId);
    return Array.isArray(list) ? list : [];
}

const settings = definePluginSettings({
    gameStatus: {
        type: OptionType.SELECT,
        description: "Playing Game = set status to",
        options: [
            { label: "Do nothing", value: "none" },
            { label: "Online", value: "online" },
            { label: "Idle", value: "idle" },
            { label: "Do Not Disturb", value: "dnd", default: true },
            { label: "Invisible", value: "invisible" }
        ]
    },
    musicStatus: {
        type: OptionType.SELECT,
        description: "Playing Music = set status to",
        options: [
            { label: "Do nothing", value: "none", default: true },
            { label: "Online", value: "online" },
            { label: "Idle", value: "idle" },
            { label: "Do Not Disturb", value: "dnd" },
            { label: "Invisible", value: "invisible" }
        ]
    },
    watchingStatus: {
        type: OptionType.SELECT,
        description: "Watching = set status to",
        options: [
            { label: "Do nothing", value: "none", default: true },
            { label: "Online", value: "online" },
            { label: "Idle", value: "idle" },
            { label: "Do Not Disturb", value: "dnd" },
            { label: "Invisible", value: "invisible" }
        ]
    },
    priorityOrder: {
        type: OptionType.SELECT,
        description: "Priority order when multiple triggers are active",
        options: [
            { label: "Playing Game > Playing Music > Watching", value: "game_music_watching", default: true },
            { label: "Playing Game > Watching > Playing Music", value: "game_watching_music" },
            { label: "Playing Music > Playing Game > Watching", value: "music_game_watching" },
            { label: "Playing Music > Watching > Playing Game", value: "music_watching_game" },
            { label: "Watching > Playing Game > Playing Music", value: "watching_game_music" },
            { label: "Watching > Playing Music > Playing Game", value: "watching_music_game" }
        ]
    },
    checkInterval: {
        type: OptionType.SELECT,
        description: "Check interval",
        options: [
            { label: "1 sec", value: 1000 },
            { label: "2 sec", value: 2000 },
            { label: "5 sec", value: 5000 },
            { label: "10 sec", value: 10000 },
            { label: "30 sec", value: 30000 },
            { label: "1 min", value: 60000, default: true },
            { label: "2 min", value: 120000 },
            { label: "5 min", value: 300000 }
        ]
    }
});

export default definePlugin({
    name: "ActivityAutoStatus",
    description: "Sets status for game/music/watching activities and restores your previous status afterwards.",
    authors: [{ name: "Nicolas M. | Nemorin", id: 546405351243907072n }],
    settings,

    lastManualStatus: null as DiscordStatus | null,
    timer: null as ReturnType<typeof setInterval> | null,

    evaluate() {
        const activities = getActivities();

        const hasMusic = activities.some(a => a?.type === 2);
        const hasGame = activities.some(a => a?.type === 0);
        const hasWatching = activities.some(a => a?.type === 3);

        const watchingTarget = toDiscordStatus(settings.store.watchingStatus as StatusOption);
        const gameTarget = toDiscordStatus(settings.store.gameStatus as StatusOption);
        const musicTarget = toDiscordStatus(settings.store.musicStatus as StatusOption);
        const priorityOrder = settings.store.priorityOrder as PriorityOrder;
        const sequence = getPrioritySequence(priorityOrder || "game_music_watching");

        const candidates = {
            game: hasGame ? gameTarget : null,
            music: hasMusic ? musicTarget : null,
            watching: hasWatching ? watchingTarget : null
        };

        let desiredStatus: DiscordStatus | null = null;

        for (const key of sequence) {
            const candidate = candidates[key];
            if (candidate) {
                desiredStatus = candidate;
                break;
            }
        }

        const currentStatus = getCurrentStatus();

        if (desiredStatus) {
            if (this.lastManualStatus == null) {
                this.lastManualStatus = currentStatus;
            }

            if (currentStatus !== desiredStatus) {
                setStatus(desiredStatus);
            }

            return;
        }

        if (this.lastManualStatus != null) {
            const restoreTo = this.lastManualStatus;
            this.lastManualStatus = null;

            if (currentStatus !== restoreTo) {
                setStatus(restoreTo);
            }
        }
    },

    start() {
        this.lastManualStatus = null;

        this.evaluate();

        this.timer = setInterval(() => {
            this.evaluate();
        }, Number(settings.store.checkInterval) || 2000);
    },

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        if (this.lastManualStatus != null) {
            setStatus(this.lastManualStatus);
            this.lastManualStatus = null;
        }
    }
});
