/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import * as DataStore from "@api/DataStore";
import { showNotification } from "@api/Notifications";
import { definePluginSettings, migratePluginSetting } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Message, User } from "@vencord/discord-types";
import { findByPropsLazy, findCssClassesLazy } from "@webpack";
import { Button, ChannelStore, Menu, openModal, showToast, Tooltip, useEffect, UserStore, useState } from "@webpack/common";

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

const classes = findCssClassesLazy("timestamp", "compact", "contentOnly");
const locale = findByPropsLazy("getLocale");

export const settings = definePluginSettings({
    showOwnTimezone: {
        type: OptionType.BOOLEAN,
        description: "Show your own timezone in profiles and message headers",
        default: true
    },

    twentyFourHourFormat: {
        type: OptionType.BOOLEAN,
        displayName: "24h Time",
        description: "Show time in 24h format",
        default: false
    },

    showTimezoneInfo: {
        type: OptionType.BOOLEAN,
        description: "Show timezone info next to time",
        default: true
    },

    showMessageHeaderTime: {
        type: OptionType.BOOLEAN,
        description: "Show time in message headers",
        default: true
    },

    recipientTimezoneInDms: {
        type: OptionType.BOOLEAN,
        description: "In DMs, show the recipient's timezone on your messages",
        default: false
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

    showLocalTimezone: {
        type: OptionType.BOOLEAN,
        description: "Show Local Timezone instead of just local",
        default: false,
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
                        showToast({ text: "Failed to reset database timezone", variant: "critical" });
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
        hour12: !settings.store.twentyFourHourFormat,
        timeZone: timezone,
        ...props
    });
    return formatter.format(date);
}

function getTimezoneAbbreviation(timezone: string, timestamp: string | number) {
    const date = new Date(timestamp);
    const formatter = new Intl.DateTimeFormat(locale.getLocale() ?? "en-US", {
        timeZone: timezone,
        timeZoneName: "short"
    });
    const parts = formatter.formatToParts(date);
    const timeZonePart = parts.find(part => part.type === "timeZoneName");
    return timeZonePart ? timeZonePart.value : "";
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
    let displayTime = shortTime;
    let isLocal = false;

    if (settings.store.showTimezoneInfo) {
        const userTimezone = getSystemTimezone();
        isLocal = timezone === userTimezone && !settings.store.showLocalTimezone;
        if (isLocal) {
            displayTime = "local";
        } else {
            const timezoneInfo = getTimezoneAbbreviation(timezone, currentTime);
            const tz = timezoneInfo || timezone;
            const hideLocalTime = isLocal && type === "message";
            displayTime = hideLocalTime ? tz : `${shortTime} ${tz}`;
        }
    }

    const longTime = getTime(timezone, currentTime, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric"
    });

    const tooltipText = isLocal ? `${longTime} (Your local timezone)` : longTime;

    return (
        <Tooltip
            position="top"
            delay={750}
            allowOverflow={false}
            spacing={8}
            hideOnClick={true}
            tooltipClassName="timezone-tooltip"
            text={tooltipText}
        >
            {toolTipProps => (
                <span
                    {...toolTipProps}
                    className={`${type === "message" ? `timezone-message-item ${classes.timestamp}` : "timezone-profile-item"}${isLocal ? " timezone-local-text" : ""}`}
                >
                    {type === "message" ? `(${displayTime})` : displayTime}
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

migratePluginSetting("Timezones", "showOwnTimezone", "Show Own Timezone");
migratePluginSetting("Timezones", "twentyFourHourFormat", "24h Time");
export default definePlugin({
    name: "Timezones",
    authors: [Devs.Aria, EquicordDevs.creations],
    description: "Shows the local time of users in profiles and message headers",
    tags: ["Appearance", "Chat", "Utility"],
    contextMenus: {
        "user-context": userContextMenuPatch
    },

    patches: [
        // stolen from ViewIcons
        {
            find: 'backgroundColor:"COMPLETE"===',
            replacement: {
                match: /bannerSrc:\i,(?=backgroundColor:"COMPLETE")/,
                replace: "$&user:arguments[0].user,"
            }
        },
        {
            find: '"--custom-cutout-radius":',
            replacement: {
                match: /(?<=children:\[)\i.{0,100}className:\i\.\i\}\)/,
                replace: "$self.renderProfileTimezone(arguments[0]),$&"
            }
        },
        {
            find: "#{intl::GUILD_COMMUNICATION_DISABLED_ICON_TOOLTIP_BODY}",
            replacement: {
                // thanks https://github.com/Syncxv/vc-timezones/pull/4
                match: /(?<=isVisibleOnlyOnHover.+?)id:.{0,15},timestamp.{1,50}}\),/,
                replace: "$&$self.renderMessageTimezone(arguments[0]),"
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
                    showToast({ text: "Timezones refreshed successfully!", variant: "success" });
                } else {
                    showToast({ text: "Timezones Failed to refresh!", variant: "critical" });
                }
            }
            catch (error) {
                console.error("Failed to refresh timezone:", error);
                showToast({ text: "Failed to refresh timezones.", variant: "critical" });
            }
        }
    },

    async start() {
        timezones = await DataStore.get<Record<string, string>>(DATASTORE_KEY) || {};

        if (settings.store.useDatabase) {
            await loadDatabaseTimezones();

            if (!settings.store.askedTimezone) {
                showNotification({
                    title: "Timezones",
                    body: "Want to save your timezone to the database? Click here to set it.",
                    onClick: () => openModal(modalProps => <SetTimezoneModal userId={UserStore.getCurrentUser().id} modalProps={modalProps} database={true} />)
                });
                settings.store.askedTimezone = true;
            }
        }
    },

    settings,
    getTime,

    renderProfileTimezone: props => {
        if (!settings.store.showProfileTime || !props?.user?.id) return null;

        const userId = props.user.id;
        if (userId === UserStore.getCurrentUser().id && !settings.store.showOwnTimezone) return null;

        return <TimestampComponent userId={userId} type="profile" />;
    },

    renderMessageTimezone: (props?: { message?: Message; }) => {
        const { showMessageHeaderTime, recipientTimezoneInDms, showOwnTimezone } = settings.store;
        if (!showMessageHeaderTime || !props?.message) return null;

        let userId = props.message.author.id;

        if (userId === UserStore.getCurrentUser().id) {
            const channel = ChannelStore.getChannel(props.message.channel_id);
            const recipientId = channel?.isDM() ? channel.getRecipientId() : null;

            if (recipientTimezoneInDms && recipientId) {
                userId = recipientId;
            } else if (!showOwnTimezone) {
                return null;
            }
        }

        return <TimestampComponent userId={userId} timestamp={props.message.timestamp.toISOString()} type="message" />;
    }
});
