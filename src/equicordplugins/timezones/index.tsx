/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
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
import { findByPropsLazy } from "@webpack";
import { Button, Menu, showToast, Toasts, Tooltip, useEffect, UserStore, useState } from "@webpack/common";
import { Message, User } from "discord-types/general";

import { authModal, deleteTimezone, getTimezone, setUserDatabaseTimezone } from "./database";
import { SetTimezoneModal } from "./TimezoneModal";

type CacheEntry = {
    value: string | null;
    expires: number;
};

export let databaseTimezones: Record<string, CacheEntry> = {};
export let timezones: Record<string, string | null> = {};
export const DATASTORE_KEY = "vencord-timezones";

const classes = findByPropsLazy("timestamp", "compact", "contentOnly");
const locale = findByPropsLazy("getLocale");

export const settings = definePluginSettings({
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

    setDatabaseTimezone: {
        description: "Set your timezone on the database",
        type: OptionType.COMPONENT,
        component: () => (
            <Button onClick={() => {
                authModal(async () => {
                    openModal(modalProps => <SetTimezoneModal userId={UserStore.getCurrentUser().id} modalProps={modalProps} database={true} />);
                }
                );
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
                onClick={() => {
                    authModal(async () => {
                        await setUserDatabaseTimezone(UserStore.getCurrentUser().id, null);
                        await deleteTimezone();
                    });
                }}
            >
                Reset Database Timezones
            </Button>
        )
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
        const localTimezone = timezones[userId];
        const shouldUseDatabase =
            settings.store.useDatabase &&
            (settings.store.preferDatabaseOverLocal || !localTimezone);

        if (shouldUseDatabase) {
            getTimezone(userId).then(e => setTimezone(e ?? localTimezone));
        } else {
            setTimezone(localTimezone);
        }
    }, [userId, settings.store.useDatabase, settings.store.preferDatabaseOverLocal]);

    useEffect(() => {
        if (type !== "profile") return;

        setCurrentTime(Date.now());

        const now = new Date();
        const delay = (60 - now.getSeconds()) * 1000 + 1000 - now.getMilliseconds();
        const timer = setTimeout(() => {
            setCurrentTime(Date.now());
        }, delay);

        return () => clearTimeout(timer);
    }, [type, currentTime]);

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
            label="Set Timezone"
            id="set-timezone"
            action={() => openModal(modalProps => <SetTimezoneModal userId={user.id} modalProps={modalProps} />)}
        />
    );

    children.push(<Menu.MenuSeparator />, setTimezoneItem);

    if (settings.store.useDatabase) {
        const refreshTimezoneItem = (
            <Menu.MenuItem
                label="Refresh Timezone"
                id="refresh-timezone"
                action={async () => {
                    showToast("Refreshing timezone...", Toasts.Type.CLOCK);

                    try {
                        const timezone = await getTimezone(user.id, true);

                        if (timezone) {
                            showToast("Timezone refreshed successfully!", Toasts.Type.SUCCESS);
                        } else {
                            showToast("Timezone reset successfully!", Toasts.Type.SUCCESS);
                        }
                    } catch (error) {
                        console.error("Failed to refresh timezone:", error);
                        showToast("Failed to refresh timezone.", Toasts.Type.FAILURE);
                    }
                }}
            />
        );
        children.push(refreshTimezoneItem);
    }
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

    async start() {
        databaseTimezones = await DataStore.get<Record<string, CacheEntry>>(DATASTORE_KEY) || {};
        timezones = await DataStore.get<Record<string, string>>(DATASTORE_KEY) || {};
    },

    settings,
    getTime,


    renderProfileTimezone: (props?: { user?: User; }) => {
        if (!settings.store.showProfileTime || !props?.user?.id) return null;

        return <TimestampComponent
            userId={props.user.id}
            type="profile"
        />;
    },

    renderMessageTimezone: (props?: { message?: Message; }) => {
        if (!settings.store.showMessageHeaderTime || !props?.message) return null;

        return <TimestampComponent
            userId={props.message.author.id}
            timestamp={props.message.timestamp.toISOString()}
            type="message"
        />;
    }
});
