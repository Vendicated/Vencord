/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { User } from "@vencord/discord-types";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { GuildMemberStore, GuildStore, React, SelectedGuildStore, Text } from "@webpack/common";

const Section = findComponentByCodeLazy("headingVariant:", '"section"', "headingIcon:");
const locale = findByPropsLazy("getLocale");

const settings = definePluginSettings({
    // where to show the dates
    showInPopup: { type: OptionType.BOOLEAN, default: true, description: "Show join date in user popups" },
    showInSidebar: { type: OptionType.BOOLEAN, default: true, description: "Show join date in the right sidebar when opening a DM" },
    showInFullProfile: { type: OptionType.BOOLEAN, default: true, description: "Show join date in the full profile modal" },
    showServerJoinDate: { type: OptionType.BOOLEAN, default: true, description: "Show when the user joined the current server (shown everywhere)" },
    showAccountCreated: { type: OptionType.BOOLEAN, default: true, description: "Show when the account was created based on the snowflake ID (shown everywhere)" },

    // date style
    dateStyle: {
        type: OptionType.SELECT,
        default: "15 Jan",
        description: "How the date part should be formatted",
        options: [
            { label: "15 Jan", value: "15 Jan" },
            { label: "15 January", value: "15 January" },
            { label: "Locale Numeric", value: "locale-numeric" },
            { label: "ISO 8601", value: "ISO 8601" }
        ]
    },

    // time stuff
    showTime: { type: OptionType.BOOLEAN, default: true, description: "Show the time alongside the date" },
    showSeconds: { type: OptionType.BOOLEAN, default: false, description: "Show seconds in the time (only works if Show Time is on)" },
    showMilliseconds: { type: OptionType.BOOLEAN, default: false, description: "Show milliseconds in the time, (only works if Show Seconds is on)" },
    showTimezone: { type: OptionType.BOOLEAN, default: false, description: "Append the timezone abbreviation to the time" },
    hourCycle: {
        type: OptionType.SELECT,
        default: "locale",
        description: "Whether to use 12h or 24h time format",
        options: [
            { label: "Locale Default", value: "locale" },
            { label: "12-hour", value: "12h" },
            { label: "24-hour", value: "24h" }
        ]
    },

    // hover and new account stuff
    hoverRelative: { type: OptionType.BOOLEAN, default: true, description: "Hover over a date to see how long ago it was (e.g. 3 years, 47 days)" },
    highlightNewAccounts: { type: OptionType.BOOLEAN, default: false, description: "Show a warning when an account is newer than the threshold below" },
    newAccountThreshold: {
        type: OptionType.SLIDER,
        default: 7,
        description: "Accounts younger than this many days will get flagged as new",
        markers: [7, 14, 30, 60, 90, 180, 365]
    }
});

function getUserLocale(): string {
    try { return locale.getLocale(); } catch { return "en-GB"; }
}

function formatDate(date: Date): string {
    const s = settings.store;
    const userLocale = getUserLocale();
    const options: Intl.DateTimeFormatOptions = {};

    // date style
    if (s.dateStyle === "locale-numeric") {
        options.day = "numeric"; options.month = "numeric"; options.year = "numeric";
    } else if (s.dateStyle === "15 January") {
        options.day = "numeric"; options.month = "long"; options.year = "numeric";
    } else if (s.dateStyle === "ISO 8601") {
        options.day = "2-digit"; options.month = "2-digit"; options.year = "numeric";
    } else {
        options.day = "numeric"; options.month = "short"; options.year = "numeric";
    }

    // time stuff
    if (s.showTime) {
        options.hour = "numeric";
        options.minute = "2-digit";
        if (s.showSeconds) {
            options.second = "2-digit";
            if (s.showMilliseconds) {
                options.fractionalSecondDigits = 3;
            }
        }
        if (s.showTimezone) {
            options.timeZoneName = "short";
        }
        if (s.hourCycle !== "locale") {
            options.hourCycle = s.hourCycle === "12h" ? "h12" : "h23";
        }
    }

    const localeToUse = s.dateStyle === "ISO 8601" ? "sv-SE" : userLocale;
    return new Intl.DateTimeFormat(localeToUse, options).format(date);
}

function formatRelative(date: Date): string {
    const userLocale = getUserLocale();
    const rtf = new Intl.RelativeTimeFormat(userLocale, { numeric: "always", style: "long" });

    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffMs / 1000 / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const years = Math.floor(days / 365);

    const remDays = days - years * 365;
    const remHours = hours - days * 24;
    const remMinutes = minutes - hours * 60;

    // strips "ago" and equivalents from the end since we're combining multiple units (very important)
    function fmt(value: number, unit: Intl.RelativeTimeFormatUnit): string {
        const parts = rtf.formatToParts(-value, unit);
        return parts.map(p => {
            if (p.type === "literal") {
                return p.value.replace(/\s*(ago|temu|назад|πριν από|前|hace|il y a|fa|geleden|vor|for|siden|prije|prieš|ezelött|ezelőtt|há|acum|sitten|för|sedan|trước|önce|před|преди|тому|पहले|ที่ผ่านมา|前|전)\s*$/i, "").trimEnd();
            }
            return p.value;
        }).join("");
    }

    const parts: string[] = [];
    if (years > 0) parts.push(fmt(years, "year"));
    if (remDays > 0) parts.push(fmt(remDays, "day"));
    if (remHours > 0) parts.push(fmt(remHours, "hour"));
    if (remMinutes > 0) parts.push(fmt(remMinutes, "minute"));

    return parts.join(", ") || fmt(1, "minute");
}

export function getAccountDate(userId: string): Date | null {
    try {
        const ms = Number((BigInt(userId) >> 22n) + 1420070400000n);
        return new Date(ms);
    } catch {
        return null;
    }
}

function DateText({ date }: { date: Date; }) {
    const [hovered, setHovered] = React.useState(false);
    const showHover = settings.store.hoverRelative && hovered;

    return (
        <Text
            variant="text-sm/normal"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{ cursor: "default", display: "inline-block" }}
        >
            {showHover ? formatRelative(date) : formatDate(date)}
        </Text>
    );
}

function NewAccountWarning({ date }: { date: Date; }) {
    if (!settings.store.highlightNewAccounts) return null;
    const daysOld = (Date.now() - date.getTime()) / 86400000;

    if (daysOld > settings.store.newAccountThreshold) return null;

    return (
        <div style={{
            fontSize: "14px",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: "4px",
            marginTop: "4px",
            cursor: "default"
        }}>
            <span>❗</span>
            <span style={{ color: "#f23f43" }}>Account is {Math.floor(daysOld)} days old</span>
        </div>
    );
}

// popup stuff
interface PopupJoinDateProps {
    user: User;
    guildId: string | null;
}

// same discord logo used in the native Member Since section
const DiscordIcon = () => (
    <svg aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" style={{ flexShrink: 0, display: "block" }}>
        <path fill="var(--interactive-icon-default)" d="M19.73 4.87a18.2 18.2 0 0 0-4.6-1.44c-.21.4-.4.8-.58 1.21-1.69-.25-3.4-.25-5.1 0-.18-.41-.37-.82-.59-1.2-1.6.27-3.14.75-4.6 1.43A19.04 19.04 0 0 0 .96 17.7a18.43 18.43 0 0 0 5.63 2.87c.46-.62.86-1.28 1.2-1.98-.65-.25-1.29-.55-1.9-.92.17-.12.32-.24.47-.37 3.58 1.7 7.7 1.7 11.28 0l.46.37c-.6.36-1.25.67-1.9.92.35.7.75 1.35 1.2 1.98 2.03-.63 3.94-1.6 5.64-2.87.47-4.87-.78-9.09-3.3-12.83ZM8.3 15.12c-1.1 0-2-1.02-2-2.27 0-1.24.88-2.26 2-2.26s2.02 1.02 2 2.26c0 1.25-.89 2.27-2 2.27Zm7.4 0c-1.1 0-2-1.02-2-2.27 0-1.24.88-2.26 2-2.26s2.02 1.02 2 2.26c0 1.25-.89 2.27-2 2.27Z" />
    </svg>
);

// fallback when a guild has no icon, shows initials like discord does
const GuildInitials = ({ name }: { name: string; }) => {
    const initials = name
        .split(" ")
        .filter(w => w.length > 0)
        .slice(0, 2)
        .map(w => w[0].toUpperCase())
        .join("");

    return (
        <div style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "9px",
            fontWeight: 700,
            color: "var(--interactive-icon-default)",
            flexShrink: 0,
            lineHeight: 1,
        }}>
            {initials}
        </div>
    );
};

// shows guild icon if available, initials if not, discord logo as last resort
function GuildIcon({ guildId }: { guildId: string; }) {
    try {
        const guild = GuildStore.getGuild(guildId);
        if (!guild) return <DiscordIcon />;
        if (guild.icon) {
            return (
                <img
                    src={`https://cdn.discordapp.com/icons/${guildId}/${guild.icon}.webp?size=16`}
                    width={16}
                    height={16}
                    style={{ borderRadius: "50%", flexShrink: 0 }}
                    alt=""
                />
            );
        }
        return <GuildInitials name={guild.name} />;
    } catch {
        return <DiscordIcon />;
    }
}

const PopupJoinDate = ErrorBoundary.wrap(({ user, guildId }: PopupJoinDateProps) => {
    let serverDate: Date | null = null;
    const accountDate = settings.store.showAccountCreated ? getAccountDate(user.id) : null;

    if (settings.store.showServerJoinDate && guildId) {
        const member = GuildMemberStore.getMember(guildId, user.id);
        if (member?.joinedAt) {
            serverDate = new Date(member.joinedAt);
        }
    }

    if (!serverDate && !accountDate) return null;

    // no server join date, just show account created (dm popup or no member data)
    if (!serverDate) {
        return (
            <div style={{ padding: "0 16px 16px" }}>
                <Section
                    heading="Account Created"
                    headingVariant="text-xs/medium"
                    headingColor="text-default"
                >
                    <DateText date={accountDate!} />
                    <NewAccountWarning date={accountDate!} />
                </Section>
            </div>
        );
    }

    // server popup, show both dates with icons
    return (
        <div style={{ padding: "0 16px 16px" }}>
            <Section
                heading="Member Since"
                headingVariant="text-xs/medium"
                headingColor="text-default"
            >
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <GuildIcon guildId={guildId!} />
                        <DateText date={serverDate} />
                    </div>
                    {accountDate && (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <DiscordIcon />
                            <DateText date={accountDate} />
                        </div>
                    )}
                    {accountDate && <NewAccountWarning date={accountDate} />}
                </div>
            </Section>
        </div>
    );
}, { noop: true });

// sidebar and full profile modal
interface SidebarJoinDateProps {
    userId: string;
    guildId?: string | null;
    isSidebar: boolean;
}

const SidebarJoinDate = ErrorBoundary.wrap(({ userId, guildId, isSidebar }: SidebarJoinDateProps) => {
    let serverDate: Date | null = null;
    const accountDate = settings.store.showAccountCreated ? getAccountDate(userId) : null;

    if (settings.store.showServerJoinDate && guildId) {
        const member = GuildMemberStore.getMember(guildId, userId);
        if (member?.joinedAt) {
            serverDate = new Date(member.joinedAt);
        }
    }

    if (!serverDate && !accountDate) return null;

    // dm or no guild context, just account created
    if (!serverDate) {
        return (
            <div className="vc-more-user-info-join-date">
                <Section
                    heading="Account Created"
                    headingVariant={isSidebar ? "text-xs/semibold" : "text-xs/medium"}
                    headingColor={isSidebar ? "text-strong" : "text-default"}
                >
                    <DateText date={accountDate!} />
                    <NewAccountWarning date={accountDate!} />
                </Section>
            </div>
        );
    }

    // server context, show both with icons
    return (
        <div className="vc-more-user-info-join-date">
            <Section
                heading="Member Since"
                headingVariant={isSidebar ? "text-xs/semibold" : "text-xs/medium"}
                headingColor={isSidebar ? "text-strong" : "text-default"}
            >
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <GuildIcon guildId={guildId!} />
                        <DateText date={serverDate} />
                    </div>
                    {accountDate && (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <DiscordIcon />
                            <DateText date={accountDate} />
                        </div>
                    )}
                    {accountDate && <NewAccountWarning date={accountDate} />}
                </div>
            </Section>
        </div>
    );
}, { noop: true });

export default definePlugin({
    name: "AdvancedJoinDate",
    description: "Shows the exact join date and time on user popouts and profiles, with relative time on hover",
    tags: ["Utility", "Appearance"],
    authors: [Devs.ZanuZoss],
    settings,

    patches: [
        // user popup, the small one that shows up when you click someone
        {
            find: "disableUserProfileLink:D=__OVERLAY__",
            replacement: {
                match: /(?<=onOpenProfile:\w\?void 0:\w+,channelId:\w,onClose:\w\}\),)\(0,\w\.jsx\)\(\w+\.A,\{user:(\w+),guildId:(\w+),channelId:\w+,onClose:\w,appContext:\w+,disableAutoFocus:\$\}\)/,
                replace: "$self.renderPopupJoinDate($1,$2),$&"
            }
        },
        // dm sidebar, the panel on the right in dms
        {
            find: ".Iyka0U),headingIcon:",
            replacement: {
                match: /#{intl::USER_PROFILE_MEMBER_SINCE}\),.{0,100}userId:(\i\.id)}\)}\)/,
                replace: "$&,$self.renderSidebarJoinDate($1,null,true)"
            }
        },
        // full profile modal
        {
            find: ",applicationRoleConnection:",
            replacement: {
                match: /#{intl::USER_PROFILE_MEMBER_SINCE}\),.{0,100}userId:(\i\.id),.{0,100}}\)}\),/,
                replace: "$&,$self.renderSidebarJoinDate($1,null,false),"
            }
        },
        // full profile modal v2, discord has two lol
        {
            find: ".MODAL_V2,onClose:",
            replacement: {
                match: /#{intl::USER_PROFILE_MEMBER_SINCE}\),.{0,100}userId:(\i\.id),.{0,100}}\)}\),/,
                replace: "$&,$self.renderSidebarJoinDate($1,null,false),"
            }
        }
    ],

    renderPopupJoinDate(user: User, guildId: string | null) {
        if (!settings.store.showInPopup || !user?.id) return null;
        return <PopupJoinDate user={user} guildId={guildId} />;
    },

    renderSidebarJoinDate(userId: string, guildId: string | null, isSidebar: boolean) {
        if (!userId) return null;
        if (isSidebar && !settings.store.showInSidebar) return null;
        if (!isSidebar && !settings.store.showInFullProfile) return null;

        // guildId is null when patched from dm/full profile, fall back to currently selected guild
        const resolvedGuildId = guildId ?? SelectedGuildStore.getGuildId() ?? null;
        return <SidebarJoinDate userId={userId} guildId={resolvedGuildId} isSidebar={isSidebar} />;
    }
});
