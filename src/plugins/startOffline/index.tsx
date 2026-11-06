/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { currentNotice, noticesQueue, popNotice, showNotice } from "@api/Notices";
import { definePluginSettings } from "@api/Settings";
import { getUserSettingLazy } from "@api/UserSettings";
import definePlugin, { makeRange, OptionType } from "@utils/types";
import {
    SelfPresenceStore,
    useEffect,
    UserSettingsProtoStore,
    useState
} from "@webpack/common";

const StatusSettings = getUserSettingLazy<string>("status", "status")!;

const settings = definePluginSettings({
    countdownSeconds: {
        description: "Seconds to wait before automatically going online",
        type: OptionType.SLIDER,
        markers: makeRange(1, 10, 1),
        default: 3,
        stickToMarkers: true
    },
    defaultAction: {
        description: "Action to take when countdown expires without user response",
        type: OptionType.SELECT,
        options: [
            {
                label: "Start Online",
                value: "online",
                default: true
            },
            {
                label: "Stay Offline (Invisible)",
                value: "invisible"
            }
        ]
    },
    showNoticeWhenOffline: {
        description: "Show a banner notice allowing you to go online with one click if you chose to stay offline",
        type: OptionType.BOOLEAN,
        default: true
    }
});

let isDeciding = true;
let userChoseOffline = false;
let savedStatus: string | null = null;
let lastPluginStatus: string | null = null;
let decisionTimer: ReturnType<typeof setTimeout> | null = null;

function safePopNotice() {
    try {
        popNotice();
    } catch {
        // Ignored
    }
}

async function setStatus(status: string) {
    lastPluginStatus = status;
    for (let i = 0; i < 20; i++) {
        try {
            if (StatusSettings?.updateSetting) {
                await StatusSettings.updateSetting(status);
                SelfPresenceStore?.emitChange?.();
                return;
            }
        } catch {
            // Ignored if user settings module not ready yet
        }
        await new Promise(resolve => setTimeout(resolve, 250));
    }
}

function goOnline() {
    if (decisionTimer) clearTimeout(decisionTimer);
    isDeciding = false;
    userChoseOffline = false;
    safePopNotice();
    const targetStatus = savedStatus || "online";
    setStatus(targetStatus);
}

function stayOffline() {
    if (decisionTimer) clearTimeout(decisionTimer);
    isDeciding = false;
    userChoseOffline = true;
    safePopNotice();
    setStatus("invisible");

    if (settings.store.showNoticeWhenOffline) {
        setTimeout(() => {
            if (!userChoseOffline) return;
            const noticeMsg = "You started Discord offline. Click to go online whenever you're ready.";
            if (
                currentNotice?.[1] === noticeMsg ||
                noticesQueue.some(([, msg]) => msg === noticeMsg)
            ) return;

            showNotice(noticeMsg, "Go Online", () => {
                goOnline();
            });
        }, 100);
    }
}

function handleUserSettingsChange() {
    const currentStatus = StatusSettings?.getSetting?.();
    if (!currentStatus || currentStatus === lastPluginStatus) return;

    lastPluginStatus = currentStatus;

    // User manually changed their status in Discord
    if (decisionTimer) clearTimeout(decisionTimer);
    isDeciding = false;
    userChoseOffline = false;

    if (currentStatus !== "invisible") {
        savedStatus = currentStatus;
        DataStore.set("StartOffline_savedStatus", currentStatus);
    }

    safePopNotice();
    SelfPresenceStore?.emitChange?.();
}

function StartupNotice({
    onStayOffline,
    onGoOnline
}: {
    onStayOffline: () => void;
    onGoOnline: () => void;
}) {
    const [secondsLeft, setSecondsLeft] = useState(settings.store.countdownSeconds);

    useEffect(() => {
        if (secondsLeft <= 0) {
            if (settings.store.defaultAction === "invisible") {
                onStayOffline();
            } else {
                onGoOnline();
            }
            return;
        }

        const timer = setTimeout(() => {
            setSecondsLeft(prev => prev - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [secondsLeft, onStayOffline, onGoOnline]);

    return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
            <span>
                Started <b>Offline (Invisible)</b>. Going online in <b>{secondsLeft}s</b>...
            </span>
            <button
                type="button"
                onClick={e => {
                    e.stopPropagation();
                    onStayOffline();
                }}
                style={{
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                    border: "1px solid rgba(255, 255, 255, 0.4)",
                    color: "inherit",
                    padding: "2px 10px",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: "0.85em",
                    fontWeight: 600
                }}
            >
                Stay Offline
            </button>
        </span>
    );
}

function displayStartupPrompt() {
    try {
        showNotice(
            <StartupNotice
                onStayOffline={stayOffline}
                onGoOnline={goOnline}
            />,
            "Go Online Now",
            goOnline
        );
    } catch {
        // Fallback if notice module encounters any issue
        goOnline();
    }
}

function onBeforeUnload() {
    // When closing Discord, save status as invisible so next launch is guaranteed to connect silently
    try {
        const current = StatusSettings?.getSetting?.();
        if (current && current !== "invisible") {
            savedStatus = current;
            DataStore.set("StartOffline_savedStatus", current);
        }
        StatusSettings?.updateSetting?.("invisible");
    } catch {
        // Ignore
    }
}

export default definePlugin({
    name: "StartOffline",
    description: "Opens Discord offline (invisible) with a 3-second prompt to stay offline or go online",
    tags: ["Utility", "Privacy"],
    authors: [{
        name: "User",
        id: 0n
    }],
    dependencies: ["UserSettingsAPI"],
    settings,

    overrideStatus(originalStatus: string) {
        if (isDeciding) {
            return "invisible";
        }
        return originalStatus;
    },

    patches: [
        {
            find: 'static displayName="SelfPresenceStore"',
            replacement: [
                {
                    match: /getLocalPresence\(\)\{return\{status:(\i),/,
                    replace: "getLocalPresence(){return{status:$self.overrideStatus($1),"
                },
                {
                    match: /getStatus\(\)\{return (\i)\}/,
                    replace: "getStatus(){return $self.overrideStatus($1)}"
                }
            ]
        }
    ],

    start() {
        isDeciding = true;
        userChoseOffline = false;

        DataStore.get<string>("StartOffline_savedStatus").then(val => {
            if (val && val !== "invisible") {
                savedStatus = val;
            }
        });

        lastPluginStatus = StatusSettings?.getSetting?.() ?? "invisible";

        UserSettingsProtoStore?.addChangeListener?.(handleUserSettingsChange);
        window.addEventListener("beforeunload", onBeforeUnload);

        // Fallback safety timer in case notice is dismissed or unmounted
        if (decisionTimer) clearTimeout(decisionTimer);
        decisionTimer = setTimeout(() => {
            if (isDeciding) {
                if (settings.store.defaultAction === "invisible") {
                    stayOffline();
                } else {
                    goOnline();
                }
            }
        }, (settings.store.countdownSeconds + 2) * 1000);

        // Display notice bar with countdown immediately on start
        displayStartupPrompt();
    },

    stop() {
        if (decisionTimer) clearTimeout(decisionTimer);
        window.removeEventListener("beforeunload", onBeforeUnload);
        UserSettingsProtoStore?.removeChangeListener?.(handleUserSettingsChange);
        isDeciding = false;
        userChoseOffline = false;
        safePopNotice();
        SelfPresenceStore?.emitChange?.();
    }
});
