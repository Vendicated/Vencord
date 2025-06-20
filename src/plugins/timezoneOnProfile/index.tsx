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
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { React } from "@webpack/common";

const timezones = [
    "UTC",

    // n america
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Toronto",
    "America/Vancouver",
    "America/Mexico_City",
    // "America/Houston", genuinely insane how this isn't in there?

    // s america
    "America/Sao_Paulo",
    "America/Buenos_Aires",
    "America/Lima",
    "America/Bogota",
    "America/Caracas",
    "America/Santiago",
    "America/Asuncion",

    // europe
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Europe/Rome",
    "Europe/Madrid",
    "Europe/Amsterdam",
    "Europe/Stockholm",
    "Europe/Athens",
    "Europe/Warsaw",
    "Europe/Istanbul",
    "Europe/Moscow",
    "Europe/Kyiv",

    // mena
    "Asia/Dubai",
    "Asia/Riyadh",
    "Asia/Tehran",
    "Asia/Jerusalem",
    "Asia/Baghdad",
    "Asia/Kuwait",
    "Asia/Qatar",
    "Asia/Nicosia",
    "Africa/Tripoli",
    "Africa/Tunis",
    "Africa/Khartoum",
    "Africa/Cairo",
    "Africa/Casablanca",

    // africa
    "Africa/Nairobi",
    "Africa/Johannesburg",
    "Africa/Lagos",

    // asia
    "Asia/Kolkata",
    "Asia/Dhaka",
    "Asia/Karachi",
    "Asia/Kathmandu",
    "Asia/Bangkok",
    "Asia/Jakarta",
    "Asia/Singapore",
    "Asia/Kuala_Lumpur",
    "Asia/Shanghai",
    "Asia/Taipei",
    "Asia/Seoul",
    "Asia/Tokyo",
    "Asia/Manila",
    "Asia/Hong_Kong",

    // oceania
    "Australia/Sydney",
    "Australia/Melbourne",
    "Australia/Brisbane",
    "Pacific/Auckland",
    "Pacific/Fiji",

    // misc and other fringe timezone cities
    "Pacific/Honolulu",
    "America/Anchorage",
    "Asia/Almaty",
    "Asia/Tashkent",
    "Asia/Yangon",
    "Asia/Vladivostok",
    "Asia/Macau",
    "Indian/Maldives",
    "Pacific/Port_Moresby",
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

const TimezoneTriggerInline = ({ userId }: { userId: string }) => {
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

    const filtered = timezones.filter(tz => tz.toLowerCase().includes(query.toLowerCase()));
    const handleSelect = (tz: string) => {
        setUserTimezone(userId, tz);
        setSelectedTz(tz);
        setOpen(false);
    };

    const renderTime = () => {
        if (!selectedTz) return <span
            style={{
                fontSize: settings.store.timeFontSize,
                color: "var(--header-primary)"
            }}
        >
            TZ ▼
        </span>;
        return <span
            style={{
                fontSize: settings.store.timeFontSize,
                color: "var(--header-primary)",
            }}
        >
            {currentTime}
        </span>;
    };

    return (
        <div ref={containerRef} style={{ position: "relative", display: "inline-block" }}>
            <div
                onClick={() => setOpen(!open)}
                style={{
                    color: "var(--header-primary)",
                }}
            >
                {renderTime()}
            </div>

            {open && (
                <div
                    style={{
                        position: "absolute",
                        top: "110%",
                        left: 0,
                        zIndex: 1000,
                        backgroundColor: "var(--background-floating)",
                        padding: "8px",
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
                        width: "220px",
                    }}
                >
                    <input
                        type="text"
                        placeholder="Search timezones..."
                        value={query}
                        onChange={e => setQuery(e.currentTarget.value)}
                        style={{
                            width: "100%",
                            padding: "6px 8px",
                            marginBottom: "6px",
                            borderRadius: "4px",
                            border: "1px solid var(--background-modifier-accent)",
                            backgroundColor: "var(--background-secondary)",
                            color: "var(--header-primary)"
                        }}
                    />
                    <div style={{ maxHeight: "250px", overflowY: "auto" }}>
                        {filtered.length > 0 ? filtered.map(tz => (
                            <div
                                key={tz}
                                onClick={() => handleSelect(tz)}
                                style={{
                                    padding: "6px 8px",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    color: "var(--header-primary)"
                                }}
                                onMouseOver={e => {
                                    (e.currentTarget as HTMLElement).style.backgroundColor = "var(--background-modifier-hover)";
                                }}
                                onMouseOut={e => {
                                    (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                                }}
                            >
                                {tz}
                            </div>
                        )) : (
                            <div style={{ color: "var(--text-muted)", padding: "6px 0" }}>
                                No matches
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
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

// @ts-ignore
export default definePlugin({
    name: "timezoneOnProfile",
    tags: ["12-Hour Format", "Time Font Size", "ShowModView", "DisableDiscoveryFilters"],
    description: "Add user-specific timezones to profiles.",
    authors: [Devs.Hazrtine],
    settings,
    TimezoneTriggerInline,
    patches: [
        {
            find: /!t\.isProvisional&&I\(\(0,r\.jsx\)\(s\.Z,\{/,
            replacement: {
                match: /!t\.isProvisional&&I\(\(0,r\.jsx\)\(s\.Z,\{/,
                replace: `!t.isProvisional&&(0,r.jsx)($self.TimezoneTriggerInline,{userId:t.id}),(0,r.jsx)("div",{className:"dotSpacer__63ed3"}),I((0,r.jsx)(s.Z,{`
            }
        }
    ]
});
