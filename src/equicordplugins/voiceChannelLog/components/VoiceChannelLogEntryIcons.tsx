/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classes } from "@utils/misc";
import { React } from "@webpack/common";

import { LogEventType } from "../types";
import { cl } from "../utils";

const iconProps = { xmlns: "http://www.w3.org/2000/svg", height: "18", width: "18" };

function JoinIcon() {
    return <svg {...iconProps}><g fill="none" fillRule="evenodd"><path d="m18 0h-18v18h18z" /><path d="m0 8h14.2l-3.6-3.6 1.4-1.4 6 6-6 6-1.4-1.4 3.6-3.6h-14.2" fill="currentColor" /></g></svg>;
}

function LeaveIcon() {
    return <svg {...iconProps}><g fill="none" fillRule="evenodd"><path d="m18 0h-18v18h18z" /><path d="m3.8 8 3.6-3.6-1.4-1.4-6 6 6 6 1.4-1.4-3.6-3.6h14.2v-2" fill="currentColor" /></g></svg>;
}

function MoveIcon() {
    return <svg {...iconProps}><g fill="none" fillRule="evenodd"><path d="m18 0h-18v18h18z" /><path d="m0 8h14.2l-3.6-3.6 1.4-1.4 6 6-6 6-1.4-1.4 3.6-3.6h-14.2" fill="currentColor" /></g></svg>;
}

function SoundboardIcon() {
    return <svg {...iconProps} viewBox="0 0 24 24" fill="none">
        <path d="M12 3v18M8 7v10M4 10v4M16 7v10M20 10v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>;
}

function MuteIcon() {
    return <svg {...iconProps} viewBox="0 0 24 24">
        <path d="M12 1a4 4 0 0 0-4 4v7a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4z" fill="currentColor" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" strokeWidth="2" fill="none" />
        <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="2" />
        <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>;
}

function DeafenIcon() {
    return <svg {...iconProps} viewBox="0 0 24 24">
        <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H3v-7zM21 14h-3a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h3v-7z" fill="currentColor" />
        <path d="M3 14v-2a9 9 0 0 1 18 0v2" stroke="currentColor" strokeWidth="2" fill="none" />
        <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>;
}

function VideoIcon() {
    return <svg {...iconProps} viewBox="0 0 24 24">
        <rect x="2" y="6" width="14" height="12" rx="2" fill="currentColor" />
        <path d="M17 9.5l5-3v11l-5-3v-5z" fill="currentColor" />
    </svg>;
}

function StreamIcon() {
    return <svg {...iconProps} viewBox="0 0 24 24">
        <rect x="2" y="3" width="20" height="14" rx="2" fill="currentColor" />
        <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="2" />
    </svg>;
}

function ActivityIcon() {
    return <svg {...iconProps} viewBox="0 0 24 24">
        <rect x="2.5" y="2.5" width="7" height="7" rx="1" transform="rotate(15 6 6)" fill="currentColor" />
        <path d="M17 3l2.5 4.5h-5z" fill="currentColor" />
        <path d="M7 14.2l.9-1.9.7.5 1.2-.8 1 .8.7-.5.9 1.9-.9 1.3.3 1.5-1.2-.6-1.2.6.3-1.5z" fill="currentColor" />
        <path d="M18.5 14c.2-.7.8-.7 1 0l.4 1.1 1.1.4c.7.2.7.8 0 1l-1.1.4-.4 1.1c-.2.7-.8.7-1 0l-.4-1.1-1.1-.4c-.7-.2-.7-.8 0-1l1.1-.4z" fill="currentColor" />
    </svg>;
}

const iconMap: Record<LogEventType, () => React.ReactNode> = {
    join: JoinIcon,
    leave: LeaveIcon,
    move: MoveIcon,
    soundboard: SoundboardIcon,
    server_mute: MuteIcon,
    server_deafen: DeafenIcon,
    self_video: VideoIcon,
    self_stream: StreamIcon,
    activity: ActivityIcon,
    activity_stop: ActivityIcon,
};

const colorMap: Record<LogEventType, string> = {
    join: "positive",
    leave: "danger",
    move: "warning",
    soundboard: "brand",
    server_mute: "danger",
    server_deafen: "danger",
    self_video: "positive",
    self_stream: "brand",
    activity: "brand",
    activity_stop: "brand",
};

export default function EventIcon({ type }: { type: LogEventType; }) {
    const IconComponent = iconMap[type];
    return <div className={classes(cl("icon"), cl(`icon-${colorMap[type]}`))}><IconComponent /></div>;
}
