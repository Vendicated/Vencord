/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { definePluginSettings } from "@api/Settings";
import { enableStyle } from "@api/Styles";
import { Devs } from "@utils/constants";
import { useTimer } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Timestamp, useEffect, useRef, useState } from "@webpack/common";

import timeZoneStyle from "./style.css?managed";

enableStyle(timeZoneStyle);

const cl = findByPropsLazy("dotSpacer", "userTag");

type TimezoneProps = {
    userId: string;
    [key: string]: any;
};

const timezones = [
    "— Clear timezone —",
    "UTC",
    ...Intl.supportedValuesOf("timeZone")
];

function setUserTimezone(userId: string, tz: string) {
    const store = { ...settings.store.timezonesByUser } as Record<string, string>;

    if (!tz) {
        delete store[userId];
    } else {
        store[userId] = tz;
    }

    // @ts-ignore
    settings.store.timezonesByUser = store;
}

export function update(tz: string): Date {
    const now = new Date();

    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    }).formatToParts(now);

    const values: Record<string, number> = {};
    for (const part of parts) {
        if (part.type !== "literal") {
            values[part.type] = Number(part.value);
        }
    }

    const targetTime = new Date(
        values.year ?? now.getFullYear(),
        (values.month ?? now.getMonth() + 1) - 1,
        values.day ?? now.getDate(),
        values.hour ?? 0,
        values.minute ?? 0,
        values.second ?? 0
    );

    const offsetMs = targetTime.getTime() - now.getTime();

    return new Date(now.getTime() + offsetMs);
} // i fucking hate this method and stupid local timezone offsets

function getUserTimezone(userId: string): string {
    return (settings.store.timezonesByUser as unknown as Record<string, string>)[userId] ?? "";
}

const TimezoneTriggerInline = (props: TimezoneProps) => {
    const { userId, tags } = props;
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [selectedTz, setSelectedTz] = useState(getUserTimezone(userId));
    const [currentTime, setCurrentTime] = useState<Date>(new Date(Date.now()));
    const containerRef = useRef<HTMLDivElement>(null);

    if (!tags.props.themeType?.startsWith("MODAL") && !selectedTz) return null;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        if (open) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [open]);

    const elapsed = useTimer({
        interval: 60_000 - (Date.now() % 60_000), // this should just adjust for ms to next minute?
        deps: [selectedTz]
    });

    useEffect(() => {
        if (!selectedTz) return;

        setCurrentTime(update(selectedTz));
    }, [elapsed, selectedTz]);

    const normalizeString = (str: string) => str.replace(/_/g, " ").toLowerCase();
    const filtered = timezones.filter(tz =>
        normalizeString(tz).includes(normalizeString(query))
    );

    const handleSelect = (tz: string) => {
        if (tz === "— Clear timezone —") {
            setUserTimezone(userId, "");
            setSelectedTz("");
            setCurrentTime(new Date());
        } else {
            setUserTimezone(userId, tz);
            setSelectedTz(tz);
            setCurrentTime(update(tz));
        }

        setOpen(false);
    };

    const renderTime = () => {
        if (!selectedTz) return <span
            style={{
                fontSize: settings.store.timeFontSize,
            }}
            className="vc-tzonprofile-badge"
        >
            TZ
        <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="currentColor"
            style={{ marginLeft: 4, marginBottom: -1 }}
        >
            <path d="M0 0l5 8 5-8H0z"/>
        </svg>
        </span>;
        return <span
            style={{
                fontSize: settings.store.timeFontSize,
            }}
            className="vc-tzonprofile-time" // i don't really know if anyone is going to want these to be two different classes but better safe
        >
            <Timestamp
                timestamp={currentTime}
            />
        </span>;
    };

    return (
        <>
            <div ref={containerRef} className="vc-tzonprofile-container">
                <div
                    onClick={() => setOpen(!open)}
                    className="vc-tzonprofile-selector"
                >
                    {renderTime()}
                </div>

                {open && (
                    <div className="vc-tzonprofile-dropdown">
                        <input
                            type="text"
                            placeholder="Search or scroll timezones..."
                            value={query}
                            onChange={e => setQuery(e.currentTarget.value)}
                            className="vc-tzonprofile-search"/>
                        <div className="vc-tzonprofile-list">
                            {filtered.length > 0 ? filtered.map(tz => (
                                <div
                                    key={tz}
                                    onClick={() => handleSelect(tz)}
                                    className={
                                        tz === "— Clear timezone —"
                                            ? "vc-tzonprofile-item vc-tzonprofile-clear"
                                            : "vc-tzonprofile-item"
                                    }
                                >
                                    {tz}
                                </div>
                            )) : (
                                <div className="vc-tzonprofile-empty">
                                    No matches.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            <div className={cl.dotSpacer}></div>
        </>
    );

};

const settings = definePluginSettings({
    timezonesByUser: {
        type: OptionType.CUSTOM,
        default: () => ({})
    },
    timeFontSize: {
        type: OptionType.NUMBER,
        description: "The font size of the time.",
        default: 14,
        min: 10,
        max: 20
    }
});

export default definePlugin({
    name: "TimezoneOnProfile",
    description: "Add user-specific timezones to profiles.",
    authors: [Devs.haz],
    settings,
    TimezoneTriggerInline,
    patches: [
        {
            find: "userTagUsername,",
            replacement: {
                match: /(!(\i)\.isProvisional&&)(\i\(\(0,(\i)\.jsx\)\(\i\.\i,\{)/,
                replace: "$1(0,$4.jsx)($self.TimezoneTriggerInline,{userId:$2.id, ...arguments[0]}),$3"
            }
        }
    ],
});

// TODO: make sure that TZ is appearing only on the main profile, not on the small popup one
