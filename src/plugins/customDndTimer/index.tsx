/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, sendBotMessage } from "@api/Commands";
import { definePluginSettings } from "@api/Settings";
import { addServerListElement, removeServerListElement, ServerListRenderPosition } from "@api/ServerList";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByCode, findStoreLazy } from "@webpack";
import { ContextMenuApi, FluxDispatcher, Menu, React } from "@webpack/common";

const StatusStore = findStoreLazy("StatusStore");

let setStatus: any;
let dndTimer: NodeJS.Timeout | null = null;
let currentTargetStatus: string | null = null;

const settings = definePluginSettings({
    defaultTime: {
        type: OptionType.STRING,
        description: "Default time when opening the custom time dialog (HH:MM format)",
        default: "14:00"
    }
});

function cancelTimer() {
    if (dndTimer) {
        clearTimeout(dndTimer);
        dndTimer = null;
        currentTargetStatus = null;
    }
}

function setDNDUntil(timeStr: string): string {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
    if (!timeRegex.test(timeStr)) {
        return "Invalid format! Use HH:MM";
    }

    const [hours, minutes] = timeStr.split(":").map(Number);
    const now = new Date();
    const target = new Date();
    
    target.setHours(hours, minutes, 0, 0);
    
    if (target < now) {
        target.setDate(target.getDate() + 1);
    }
    
    const timeout = target.getTime() - now.getTime();
    const h = Math.floor(timeout / 3600000);
    const m = Math.floor((timeout % 3600000) / 60000);

    cancelTimer();

    try {
        setStatus({ nextStatus: "dnd" });
        currentTargetStatus = "online";

        dndTimer = setTimeout(() => {
            setStatus({ nextStatus: currentTargetStatus || "online" });
            cancelTimer();
        }, timeout);

        return `DND until ${timeStr} (${h}h ${m}m)`;
    } catch (e) {
        return `Error: ${e}`;
    }
}

function onStatusChange() {
    const currentStatus = StatusStore.getStatus();
    
    if (dndTimer && currentStatus !== "dnd") {
        console.log("[CustomDndTimer] Status manually changed, cancelling timer");
        cancelTimer();
    }
}

function DNDTimerIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24">
            <path
                fill="currentColor"
                d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.2 14.2L11 13V7h1.5v5.2l4.5 2.7-.8 1.3z"
            />
            {dndTimer && (
                <circle cx="19" cy="5" r="4" fill="var(--status-danger)" />
            )}
        </svg>
    );
}

function CancelTimerMenu() {
    return (
        <Menu.Menu navId="dnd-timer-menu" onClose={() => ContextMenuApi.closeContextMenu()}>
            <Menu.MenuItem
                id="dnd-cancel"
                label="Cancel Timer"
                action={() => {
                    cancelTimer();
                    setStatus({ nextStatus: "online" });
                    ContextMenuApi.closeContextMenu();
                }}
                color="danger"
            />
        </Menu.Menu>
    );
}

function SetTimerMenu() {
    const { defaultTime } = settings.use(["defaultTime"]);
    
    return (
        <Menu.Menu navId="dnd-timer-menu" onClose={() => ContextMenuApi.closeContextMenu()}>
            <Menu.MenuItem
                id="dnd-default"
                label={`Until ${defaultTime} (default)`}
                action={() => {
                    setDNDUntil(defaultTime);
                    ContextMenuApi.closeContextMenu();
                }}
            />
            <Menu.MenuSeparator />
            <Menu.MenuItem
                id="dnd-30min"
                label="30 minutes"
                action={() => {
                    const target = new Date();
                    target.setMinutes(target.getMinutes() + 30);
                    const time = `${target.getHours()}:${String(target.getMinutes()).padStart(2, "0")}`;
                    setDNDUntil(time);
                    ContextMenuApi.closeContextMenu();
                }}
            />
            <Menu.MenuItem
                id="dnd-2h"
                label="2 hours"
                action={() => {
                    const target = new Date();
                    target.setHours(target.getHours() + 2);
                    const time = `${target.getHours()}:${String(target.getMinutes()).padStart(2, "0")}`;
                    setDNDUntil(time);
                    ContextMenuApi.closeContextMenu();
                }}
            />
            <Menu.MenuItem
                id="dnd-3h"
                label="3 hours"
                action={() => {
                    const target = new Date();
                    target.setHours(target.getHours() + 3);
                    const time = `${target.getHours()}:${String(target.getMinutes()).padStart(2, "0")}`;
                    setDNDUntil(time);
                    ContextMenuApi.closeContextMenu();
                }}
            />
            <Menu.MenuItem
                id="dnd-6h"
                label="6 hours"
                action={() => {
                    const target = new Date();
                    target.setHours(target.getHours() + 6);
                    const time = `${target.getHours()}:${String(target.getMinutes()).padStart(2, "0")}`;
                    setDNDUntil(time);
                    ContextMenuApi.closeContextMenu();
                }}
            />
            <Menu.MenuSeparator />
            <Menu.MenuItem
                id="dnd-midnight"
                label="Until midnight"
                action={() => {
                    setDNDUntil("23:59");
                    ContextMenuApi.closeContextMenu();
                }}
            />
        </Menu.Menu>
    );
}

function DNDTimerButton() {
    const [, forceUpdate] = React.useReducer(x => x + 1, 0);

    React.useEffect(() => {
        const interval = setInterval(forceUpdate, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleClick = (e: React.MouseEvent) => {
        if (dndTimer) {
            ContextMenuApi.openContextMenu(e, CancelTimerMenu);
        } else {
            ContextMenuApi.openContextMenu(e, SetTimerMenu);
        }
    };

    return (
        <div
            className="vc-dnd-timer-button"
            onClick={handleClick}
            onContextMenu={handleClick}
            style={{
                padding: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "4px",
                transition: "background-color 0.2s",
                color: "white",
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--background-modifier-hover)";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
            }}
            title={dndTimer ? "DND Timer Active - Click to cancel" : "Set DND Timer"}
        >
            <DNDTimerIcon />
        </div>
    );
}

export default definePlugin({
    name: "CustomDndTimer",
    description: "Set Do Not Disturb status until a specific time with automatic reset. Click the clock icon in the server list to set or cancel the timer. If you want there are also / commands: use /dnd-until for specific times, and /dnd-cancel to cancel the timer.",
    authors: [Devs.avokade],
    dependencies: ["ServerListAPI"],
    settings,

    flux: {
        STATUS_SET: onStatusChange
    },

    start() {
        setStatus = findByCode("updateAsync", "status");
        FluxDispatcher.subscribe("STATUS_SET", onStatusChange);
        addServerListElement(ServerListRenderPosition.Below, this.renderDNDTimerButton);
    },

    stop() {
        cancelTimer();
        FluxDispatcher.unsubscribe("STATUS_SET", onStatusChange);
        removeServerListElement(ServerListRenderPosition.Below, this.renderDNDTimerButton);
    },

    commands: [
        {
            name: "dnd-until",
            description: "Set DND until a specific time",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "time",
                    description: "Time in HH:MM format (e.g. 14:00)",
                    type: ApplicationCommandOptionType.STRING,
                    required: true
                }
            ],
            execute: (args, ctx) => {
                const result = setDNDUntil(args[0].value);
                sendBotMessage(ctx.channel.id, { content: result });
            }
        },
        {
            name: "dnd-cancel",
            description: "Cancel the DND timer",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: (args, ctx) => {
                if (dndTimer) {
                    cancelTimer();
                    setStatus({ nextStatus: "online" });
                    sendBotMessage(ctx.channel.id, { content: "DND timer cancelled" });
                } else {
                    sendBotMessage(ctx.channel.id, { content: "No active timer" });
                }             
            }
        }
    ],

    renderDNDTimerButton: ErrorBoundary.wrap(DNDTimerButton, { noop: true })
});
