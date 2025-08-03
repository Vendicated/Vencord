/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import * as DataStore from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs, EquicordDevs } from "@utils/constants";
import { openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { Message, User } from "@vencord/discord-types";
import { findByPropsLazy } from "@webpack";
import { Button, Menu, showToast, Toasts, Tooltip, useEffect, UserStore, useState } from "@webpack/common";

import { deleteTimezone, getTimezone, loadDatabaseTimezones, setUserDatabaseTimezone } from "./database";
import { SetTimezoneModal } from "./TimezoneModal";

export let timezones: Record<string, string | null> = {};
export const DATASTORE_KEY = "vencord-timezones";

export function resolveUserTimezone(userId: string): string | null {
    const localTimezone = timezones[userId];
    const shouldUseDatabase =
        settings.store.useDatabase &&
        (settings.store.preferDatabaseOverLocal || !localTimezone);

    if (shouldUseDatabase) {
        return getTimezone(userId) ?? localTimezone;
    }
    return localTimezone;
}

export function getSystemTimezone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

const classes = findByPropsLazy("timestamp", "compact", "contentOnly");
const locale = findByPropsLazy("getLocale");

export const settings = definePluginSettings({
    "Show Own Timezone": {
        type: OptionType.BOOLEAN,
        description: "Show your own timezone in profiles and message headers",
        default: true
    },

    "24h Time": {
        type: OptionType.BOOLEAN,
        description: "Show time in 24h format",
        default: false
    },

    showMessageHeaderTime: {
        type: OptionType.BOOLEAN,
        description: "Show time in message headers",
        default: true
    },

    showProfileTime: {
        type: OptionType.BOOLEAN,
        description: "Show time in profiles",
        default: true
    },

    useDatabase: {
        type: OptionType.BOOLEAN,
        description: "Enable database for getting user timezones",
        default: true
    },

    preferDatabaseOverLocal: {
        type: OptionType.BOOLEAN,
        description: "Prefer database over local storage for timezones",
        default: true
    },

    databaseUrl: {
        type: OptionType.STRING,
        description: "Database URL for timezone storage",
        default: "https://timezone.creations.works"
    },

    setDatabaseTimezone: {
        description: "Set your timezone on the database",
        type: OptionType.COMPONENT,
        component: () => (
            <Button onClick={() => {
                openModal(modalProps => <SetTimezoneModal userId={UserStore.getCurrentUser().id} modalProps={modalProps} database={true} />);
            }}>
                Set Timezone on Database
            </Button>
        )
    },

    resetDatabaseTimezone: {
        description: "Reset your timezone on the database",
        type: OptionType.COMPONENT,
        component: () => (
            <Button
                color={Button.Colors.RED}
                onClick={async () => {
                    try {
                        await setUserDatabaseTimezone(UserStore.getCurrentUser().id, null);
                        await deleteTimezone();
                    } catch (error) {
                        console.error("Error resetting database timezone:", error);
                        showToast("Failed to reset database timezone", Toasts.Type.FAILURE);
                    }
                }}
            >
                Reset Database Timezone
            </Button>
        )
    },

    askedTimezone: {
        type: OptionType.BOOLEAN,
        description: "Whether the user has been asked to set their timezone",
        hidden: true,
        default: false
    }
});

function getTime(timezone: string, timestamp: string | number, props: Intl.DateTimeFormatOptions = {}) {
    const date = new Date(timestamp);
    const formatter = new Intl.DateTimeFormat(locale.getLocale() ?? "en-US", {
        hour12: !settings.store["24h Time"],
        timeZone: timezone,
        ...props
    });
    return formatter.format(date);
}

interface Props {
    userId: string;
    timestamp?: string;
    type: "message" | "profile";
}

const TimestampComponent = ErrorBoundary.wrap(({ userId, timestamp, type }: Props) => {
    const [currentTime, setCurrentTime] = useState(timestamp || Date.now());
    const [timezone, setTimezone] = useState<string | null>(null);

    useEffect(() => {
        setTimezone(resolveUserTimezone(userId));
    }, [userId, settings.store.useDatabase, settings.store.preferDatabaseOverLocal]);

    useEffect(() => {
        if (type !== "profile") return;

        setCurrentTime(Date.now());

        const now = new Date();
        const delay = (60 - now.getSeconds()) * 1000 + 1000 - now.getMilliseconds();
        const timer = setTimeout(() => {
            setCurrentTime(Date.now());
        }, delay);

        const interval = setInterval(() => {
            setCurrentTime(Date.now());
        }, 60000);

        return () => {
            clearTimeout(timer);
            clearInterval(interval);
        };
    }, [type]);

    if (!timezone) return null;

    const shortTime = getTime(timezone, currentTime, { hour: "numeric", minute: "numeric" });
    const longTime = getTime(timezone, currentTime, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric"
    });

    return (
        <Tooltip
            position="top"
            // @ts-ignore
            delay={750}
            allowOverflow={false}
            spacing={8}
            hideOnClick={true}
            tooltipClassName="timezone-tooltip"
            text={longTime}
        >
            {toolTipProps => (
                <span
                    {...toolTipProps}
                    className={type === "message" ? `timezone-message-item ${classes.timestamp}` : "timezone-profile-item"}
                >
                    {type === "message" ? `(${shortTime})` : shortTime}
                </span>
            )}
        </Tooltip>
    );
}, { noop: true });

const userContextMenuPatch: NavContextMenuPatchCallback = (children, { user }: { user: User; }) => {
    if (user?.id == null) return;

    const setTimezoneItem = (
        <Menu.MenuItem
            label="Set Local Timezone"
            id="set-timezone"
            action={() => openModal(modalProps => <SetTimezoneModal userId={user.id} modalProps={modalProps} />)}
        />
    );

    children.push(<Menu.MenuSeparator />, setTimezoneItem);
};

export default definePlugin({
    name: "Timezones",
    authors: [Devs.Aria, EquicordDevs.creations],
    description: "Shows the local time of users in profiles and message headers",
    contextMenus: {
        "user-context": userContextMenuPatch
    },

    patches: [
        // stolen from ViewIcons
        {
            find: 'backgroundColor:"COMPLETE"',
            replacement: {
                match: /(?<=backgroundImage.+?)children:\[/,
                replace: "$&$self.renderProfileTimezone(arguments[0]),"
            }
        },
        {
            find: '"Message Username"',
            replacement: {
                // thanks https://github.com/Syncxv/vc-timezones/pull/4
                match: /(?<=isVisibleOnlyOnHover.+?)id:.{1,11},timestamp.{1,50}}\),/,
                replace: "$&,$self.renderMessageTimezone(arguments[0]),"
            }
        }
    ],

    toolboxActions: {
        "Set Database Timezone": () => {
            openModal(modalProps => <SetTimezoneModal userId={UserStore.getCurrentUser().id} modalProps={modalProps} database={true} />);
        },
        "Refresh Database Timezones": async () => {
            try {
                const good = await loadDatabaseTimezones();

                if (good) {
                    showToast("Timezones refreshed successfully!", Toasts.Type.SUCCESS);
                } else {
                    showToast("Timezones Failed to refresh!", Toasts.Type.FAILURE);
                }
            }
            catch (error) {
                console.error("Failed to refresh timezone:", error);
                showToast("Failed to refresh timezones.", Toasts.Type.FAILURE);
            }
        }
    },

    async start() {
        timezones = await DataStore.get<Record<string, string>>(DATASTORE_KEY) || {};

        if (settings.store.useDatabase) {
            await loadDatabaseTimezones();

            if (!settings.store.askedTimezone) {
                showToast(
                    "",
                    Toasts.Type.MESSAGE,
                    {
                        duration: 10000,
                        component: (
                            <Button
                                color={Button.Colors.GREEN}
                                onClick={() => {
                                    openModal(modalProps => <SetTimezoneModal userId={UserStore.getCurrentUser().id} modalProps={modalProps} database={true} />);
                                }}
                            >
                                Want to save your timezone to the database? Click here to set it.
                            </Button>
                        ),
                        position: Toasts.Position.BOTTOM
                    }
                );
                settings.store.askedTimezone = true;
            }
        }
    },

    settings,
    getTime,

    renderProfileTimezone: (props?: { user?: User; }) => {
        if (!settings.store.showProfileTime || !props?.user?.id) return null;
        if (props.user.id === UserStore.getCurrentUser().id && !settings.store["Show Own Timezone"]) return null;

        return <TimestampComponent userId={props.user.id} type="profile" />;
    },

    renderMessageTimezone: (props?: { message?: Message; }) => {
        if (!settings.store.showMessageHeaderTime || !props?.message) return null;
        if (props.message.author.id === UserStore.getCurrentUser().id && !settings.store["Show Own Timezone"]) return null;

        return <TimestampComponent userId={props.message.author.id} timestamp={props.message.timestamp.toISOString()} type="message" />;
    }
});
