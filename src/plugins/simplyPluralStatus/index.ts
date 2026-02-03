/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { findStoreLazy } from "@webpack";
import { lodash } from "@webpack/common";

const UserSettingsProtoStore = findStoreLazy("UserSettingsProtoStore");
const logger = new Logger("SimplyPlural");
let socket: WebSocket | undefined;

type SimplyPluralApiResponse<ContentType> = {
    exists: boolean,
    id: string,
    content: ContentType;
};

type Me = {
    uid: string,
    isASystem: boolean,
    username: string,
};
type Member = {
    name: string,
    avatarUrl: string,
    desc: string,
    uid: string,
    pkid: string,
    preventFrontNotifs: boolean,
    color: string,
    pronouns: string,
    isASystem: boolean,
    username: string,
};
type FrontEntry = {
    custom: boolean,
    startTime: number,
    endTime: number | undefined,
    member: string,
    live: boolean,
    customStatus: string,
    uid: string,
    lastOperationTime: number,
};
type WSMessage = {
    msg: "insert" | "update",
    target: string,
    results: Update<any>[];
};
type Update<ContentType> = {
    operationType: "insert" | "update",
    exists: boolean,
    id: string,
    content: ContentType,
};

let systemUid = "";
const Front = {} as Record<string, Record<string, string>>;
const members: Record<string, Member> = {};
const frontHistory: Record<string, FrontEntry> = {};

let cachedAPIModule = null;
let intervalId: any;

function getAPIModule() {
    if (!cachedAPIModule) {
        const modules = findSpecificModules();
        cachedAPIModule = modules.patch[0].export;
    }
    return cachedAPIModule;
}

function updateStatus() {
    if (!settings.store.updateStatus) return;

    logger.debug("updating status");
    const frontHistorySorted = lodash.sortBy(frontHistory, e => e.startTime);
    let frontEntries = frontHistorySorted.filter(e => e.live);
    frontEntries = lodash.uniqBy(frontEntries, e => e.member);
    logger.debug("frontEntries", frontEntries);
    const frontMembers = frontEntries.map(e => members[e.member]);

    logger.debug("fronting", frontMembers);

    const joinStr = settings.store.joinString || " & ";
    const prefix = settings.store.statusPrefix || "";
    const suffix = settings.store.statusSuffix || "";
    let newStatusText: string;

    if (frontMembers.length === 0) {
        newStatusText = settings.store.emptyFrontText || "";
    } else {
        newStatusText = prefix + frontMembers.map(m => m.name).join(joinStr) + suffix;
    }
    logger.debug("old customStatus", UserSettingsProtoStore.settings.status.customStatus);
    logger.info("setting customStatus text", newStatusText);

    // Update status via API
    getAPIModule().patch({
        url: "/users/@me/settings",
        body: {
            custom_status: {
                text: newStatusText,
                emoji_name: UserSettingsProtoStore.settings.status.customStatus.emojiName,
                emoji_id: UserSettingsProtoStore.settings.status.customStatus.emojiId,
                expires_at: 0
            }
        }
    }).then(response => {
        logger.debug("✅ Status updated successfully!", response);
    }).catch(error => {
        logger.error("API call failed:", error);
    });
}

// Helper function to find specific modules
function findSpecificModules() {
    const targets = ["patch", "getCurrentUser"];
    const results = {};
    const modules = webpackChunkdiscord_app.push([[Math.random()], {}, req => Object.values(req.c)]);
    webpackChunkdiscord_app.pop();

    modules.forEach((m, index) => {
        if (m.exports) {
            for (const key in m.exports) {
                const exportItem = m.exports[key];
                if (exportItem && typeof exportItem === "object") {
                    targets.forEach(target => {
                        if (exportItem[target]) {
                            if (!results[target]) results[target] = [];
                            results[target].push({ index, key, export: exportItem });
                        }
                    });
                }
            }
        }
    });

    return results;
}

function initWs(isManual = false) {
    let wasConnected = isManual;
    let hasErrored = false;
    const ws = socket = new WebSocket("wss://api.apparyllis.com/v1/socket");

    let initialized = false;
    let authenticated = false;

    ws.addEventListener("open", () => {
        wasConnected = true;

        logger.info("Connected to WebSocket");

        if (settings.store.notifyOnAutoConnect || isManual) {
            maybeNotify("notifyOnAutoConnect", {
                title: "SimplyPlural Connected",
                body: "Connected to WebSocket",
                noPersist: true
            });
        }
    });

    ws.addEventListener("error", e => {
        if (!wasConnected) return;

        hasErrored = true;

        logger.error("SimplyPlural Error:", e);

        maybeNotify("notifyOnError", {
            title: "SimplyPlural Error",
            body: (e as ErrorEvent).message || "No Error Message",
            color: "var(--status-danger, red)",
            noPersist: true,
        });
    });

    ws.addEventListener("close", e => {
        if (!wasConnected || hasErrored) return;

        logger.info("SimplyPlural Disconnected:", e.code, e.reason);

        maybeNotify("notifyOnDisconnect", {
            title: "SimplyPlural Disconnected",
            body: e.reason || "No Reason provided",
            color: "var(--status-danger, red)",
            noPersist: true,
        });

        clearInterval(intervalId);

        // Try to reconnect if not closed intentionally
        const intentionalReasons = [
            "Sync Disabled",
            "Reconnecting",
            "Plugin Stopped"
        ];
        if (!intentionalReasons.includes(e.reason)) {
            logger.info("Attempting to reconnect to SimplyPlural WebSocket...");
            setTimeout(() => initWs(), 5000); // Retry after 5 seconds
        }
    });

    ws.addEventListener("message", e => {
        if (!initialized) {
            initialized = true;
            logger.info("sending auth message");
            ws.send(`{"op":"authenticate","token":"${settings.store.simplyPluralToken}"}`);
            return;
        }
        if (!authenticated) {
            try {
                var message = JSON.parse(e.data);
                // var { msg, target, results } = JSON.parse(e.data);
            } catch (err) {
                logger.error("Invalid JSON:", err, "\n" + e.data);
                return;
            }
            if (message.msg === "Successfully authenticated") {
                authenticated = true;
                // Start ping interval
                intervalId = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        logger.debug("PING");
                        ws.send("ping");
                    } else {
                        logger.warn("WebSocket not open, skipping ping");
                    }
                }, 10_000);
            }
            return;
        }
        if (e.data === "pong") {
            logger.debug("PONG");
            return;
        }

        try {
            var wsMessage: WSMessage = JSON.parse(e.data);
            // var { msg, target, results } = JSON.parse(e.data);
        } catch (err) {
            logger.error("Invalid JSON:", err, "\n" + e.data);
            return;
        }

        logger.info("Received Message:", wsMessage);

        switch (wsMessage.target) {
            case "frontHistory": {
                wsMessage.results.forEach(update => {
                    switch (update.operationType) {
                        case "insert": {
                            frontHistory[update.id] = update.content;
                            break;
                        }
                        case "update": {
                            frontHistory[update.id] = update.content;
                            break;
                        }
                        default: {
                            logger.warn("unknown operationType", update.operationType);
                            break;
                        }
                    }

                });

                updateStatus();
                break;
            }
            default:
                logger.warn("unknown target", wsMessage.target);
                // reply("Unknown Type " + type);
                break;
        }
    });
}

const settings = definePluginSettings({
    simplyPluralToken: {
        description: "Read only API Token https://docs.apparyllis.com/docs/getting-started/authentication",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true
    },
    updateStatus: {
        description: "Disable to pause status updates",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: false
    },
    notifyOnAutoConnect: {
        description: "Show notification when auto-connecting to SimplyPlural WebSocket",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: false
    },
    notifyOnError: {
        description: "Show notification on SimplyPlural WebSocket error",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: false
    },
    notifyOnDisconnect: {
        description: "Show notification when SimplyPlural WebSocket disconnects",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: false
    },
    notifyOnSyncToggle: {
        description: "Show notification when toggling SimplyPlural sync",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: false
    },
    notifyOnForceUpdate: {
        description: "Show notification when forcing status update",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: false
    },
    joinString: {
        description: "String used to join member names in status (e.g. ' & ' / ', ' / ' and '. Don't forget the spaces!)",
        type: OptionType.STRING,
        default: " & ",
        restartNeeded: false
    },
    statusPrefix: {
        description: "Prefix for your status (e.g. 'f: ' / 'fronting: '. Don't forget the space!)",
        type: OptionType.STRING,
        default: "",
        restartNeeded: false
    },
    statusSuffix: {
        description: "Suffix for your status (e.g. ' | wahoogie'. Don't forget the space!)",
        type: OptionType.STRING,
        default: "",
        restartNeeded: false
    },
    emptyFrontText: {
        description: "Text to display when no-one is fronting (e.g. 'No one is fronting' or 'f: ?')",
        type: OptionType.STRING,
        default: "f: ?",
        restartNeeded: false
    }
});
// .withPrivateSettings<{
//     token: string;
//     statusSync: boolean;
// }>();

function maybeNotify(type: keyof typeof settings.store, options: Parameters<typeof showNotification>[0]) {
    if (settings.store[type]) {
        showNotification(options);
    }
}

export default definePlugin({
    name: "SimplyPluralStatus",
    description: "Tracks current front status from SimplyPlural and updates your status text",
    authors:[{
        name: "rz30",
        id: 786315593963536415n
    }, {
        name: "l2cu",
        id: 1208352443512004648n
}],
    settings,

    toolboxActions: {
        // TODO: maybe add toggles disable the sync quickly here ?
        "Simply Plural Toggle"() {
            settings.store.updateStatus = !settings.store.updateStatus;
            if (settings.store.updateStatus) {
                maybeNotify("notifyOnSyncToggle", {
                    title: "SimplyPlural Sync Enabled",
                    body: "Starting websocket",
                    noPersist: true
                });
                initWs(true);
            } else {
                maybeNotify("notifyOnSyncToggle", {
                    title: "SimplyPlural Sync Disabled",
                    body: "Stopping websocket",
                    noPersist: true
                });
                socket?.close(1000, "Sync Disabled");
            }
        },
        "Force Status Update"() {
            updateStatus();
            maybeNotify("notifyOnForceUpdate", {
                title: "SimplyPlural",
                body: "Status update forced.",
                noPersist: true
            });
        },
        "Reconnect Websocket"() {
            clearInterval(intervalId);
            socket?.close(1000, "Reconnecting");
            initWs(true);
        }
    },
    async start() {
        if (settings.store.simplyPluralToken === "") {
            logger.error("token is not set");
            return;
        }
        // TODO: check if is enabled && token is not empty
        const me: SimplyPluralApiResponse<Me> = await fetch(
            "https://api.apparyllis.com/v1/me",
            {
                method: "GET",
                headers: {
                    "Authorization": settings.store.simplyPluralToken
                },
                // redirect: "follow"
            }
        ).then(r => r.json());
        systemUid = me.id;

        const system: SimplyPluralApiResponse<Member>[] = await fetch(
            `https://api.apparyllis.com/v1/members/${systemUid}`,
            {
                method: "GET",
                headers: {
                    "Authorization": settings.store.simplyPluralToken
                },
                // redirect: "follow"
            }
        ).then(r => r.json());

        system.forEach(apiResp => {
            members[apiResp.id] = apiResp.content;
        });

        // let members = system.map(m => m.content)

        const fronters: SimplyPluralApiResponse<FrontEntry>[] = await fetch(
            "https://api.apparyllis.com/v1/fronters",
            {
                method: "GET",
                headers: {
                    "Authorization": settings.store.simplyPluralToken
                },
                // redirect: "follow"
            }
        ).then(r => r.json());
        fronters.forEach(fronter => {
            frontHistory[fronter.id] = fronter.content;
        });

        logger.info("members", members);

        updateStatus();
        initWs();
    },

    async stop() {
        clearInterval(intervalId);
        socket?.close(1000, "Plugin Stopped");
        socket = void 0;
    }
});

