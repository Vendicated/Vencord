/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { addContextMenuPatch, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import * as DataStore from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { i18n, Menu, Tooltip, useEffect, useState } from "@webpack/common";
import { Message, User } from "discord-types/general";

import { SetTimezoneModal } from "./TimezoneModal";

export const DATASTORE_KEY = "vencord-timezones";

export let timezones: Record<string, string | null> = {};
(async () => {
    timezones = await DataStore.get<Record<string, string>>(DATASTORE_KEY) || {};
})();

const classes = findByPropsLazy("timestamp", "compact", "content");

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
    }
});

function getTime(timezone: string, timestamp: string | number, props: Intl.DateTimeFormatOptions = {}) {
    const date = new Date(timestamp);
    const formatter = new Intl.DateTimeFormat(i18n?.getLocale?.() ?? "en-US", {
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
    const timezone = timezones[userId];

    useEffect(() => {
        let timer: NodeJS.Timeout;

        if (type === "profile") {
            setCurrentTime(Date.now());

            const now = new Date();
            const delay = (60 - now.getSeconds()) * 1000 + 1000 - now.getMilliseconds();

            timer = setTimeout(() => {
                setCurrentTime(Date.now());
            }, delay);
        }

        return () => timer && clearTimeout(timer);
    }, [type, currentTime]);

    if (!timezone) return null;

    const shortTime = getTime(timezone, currentTime, { hour: "numeric", minute: "numeric" });
    const longTime = getTime(timezone, currentTime, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
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
            {toolTipProps => {
                return (
                    <span
                        {...toolTipProps}
                        className={type === "message" ? `timezone-message-item ${classes.timestamp}` : "timezone-profile-item"}
                    >
                        {
                            type === "message" ? `(${shortTime})` : shortTime
                        }
                    </span>
                );
            }}
        </Tooltip>
    );
}, { noop: true });


export default definePlugin({
    name: "Timezone",
    authors: [Devs.Aria],
    description: "Shows the local time of users in profiles and message headers",

    patches: [
        {
            find: ".NITRO_BANNER,",
            replacement: {
                match: /getUserBannerStyles.{1,600}children:\[/,
                replace: "$&$self.renderProfileTimezone(arguments[0]),"
            }
        },
        {
            find: ".badgesContainer,",
            replacement: {
                match: /id:\(0,\i\.getMessageTimestampId\)\(\i\),timestamp.{1,50}}\),/,
                replace: "$&,$self.renderMessageTimezone(arguments[0]),"
            }
        }
    ],
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
    },

    start() {
        addContextMenuPatch("user-context", userContextMenuPatch);
    },

    stop() {
        removeContextMenuPatch("user-context", userContextMenuPatch);
    }

});


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

};
