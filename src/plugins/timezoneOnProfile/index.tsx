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
import definePlugin, { OptionType } from "@utils/types";
import { wreq } from "@webpack";
import { React } from "@webpack/common";

import timeZoneStyle from "./style.css?managed";

const timezones = [
    "UTC", ...Intl.supportedValuesOf("timeZone")
];

function setUserTimezone(userId: string, tz: string) {
    // @ts-ignore
    settings.store.timezonesByUser = {
        ...settings.store.timezonesByUser,
        [userId]: tz
    };
}

function update(tz: string): string {
    try {
        return new Intl.DateTimeFormat("en-US", {
            timeZone: tz,
            hour: "2-digit",
            minute: "2-digit",
            hour12: settings.store.Use12HourFormat
        }).format(new Date());
    } catch {
        return "??:??";
    }
}

function getUserTimezone(userId: string): string {
    return (settings.store.timezonesByUser as unknown as Record<string, string>)[userId] ?? "";
}

const TimezoneTriggerInline = ({ userId }: { userId: string; }) => {
    enableStyle(timeZoneStyle);
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");
    const [selectedTz, setSelectedTz] = React.useState(getUserTimezone(userId));
    const [currentTime, setCurrentTime] = React.useState("");

    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
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

    React.useEffect(() => {
        if (!selectedTz) return;
        const updateTime = () => {
            setCurrentTime(update(selectedTz));
        };
        updateTime();
        const interval = setInterval(updateTime, 60000);
        return () => clearInterval(interval);
    }, [selectedTz]);

    const normalizeString = (str: string) => str.replace(/_/g, " ").toLowerCase();
    const filtered = timezones.filter(tz =>
        normalizeString(tz).includes(normalizeString(query))
    );

    const handleSelect = (tz: string) => {
        setUserTimezone(userId, tz);
        setSelectedTz(tz);
        setOpen(false);
    };

    const renderTime = () => {
        if (!selectedTz) return <span
            style={{
                fontSize: settings.store.timeFontSize,
            }}
            className="vc-tzonprofile-badge"
        >
            TZ ▼
        </span>;
        return <span
            style={{
                fontSize: settings.store.timeFontSize,
            }}
            className="vc-tzonprofile-time" // i don't really know if anyone is going to want these to be two different classes but better safe
        >
            {currentTime}
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
                                    className="vc-tzonprofile-item"
                                >
                                    {tz}
                                </div>
                            )) : (
                                <div className="vc-tzonprofile-empty">
                                    No matches
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            <div aria-hidden="true" className="dotSpacer__63ed3"></div>
        </>
    );

};

const settings = definePluginSettings({
    timezonesByUser: {
        type: OptionType.CUSTOM,
        default: () => ({})
    },
    Use12HourFormat: {
        type: OptionType.BOOLEAN,
        description: "Would you like to use the 12 hour time format?",
        default: false,
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
    tags: ["12-Hour Format", "Time Font Size", "ShowModView", "DisableDiscoveryFilters"],
    description: "Add user-specific timezones to profiles.",
    authors: [Devs.Hazrtine],
    settings,
    TimezoneTriggerInline,
    patches: [
        {
            find: /!t\.isProvisional&&\i\(\(0,\i\.jsx\)\(\i\.\i,\{/,
            replacement: {
                match: /(!t\.isProvisional&&)(\i\(\(0,(\i)\.jsx\)\(\i\.\i,\{)/,
                replace: "$1(0,$3.jsx)($self.TimezoneTriggerInline,{userId:t.id}),$2"
            }
        }
    ],
});
