/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@utils/css";

import { ExtendedMessage } from "../types";
import { phantomMessageMap } from "../utils";
import { TimerIcon } from "./Icons";

const cl = classNameFactory("vc-scheduled-msg-");

export function MessageAccessory({ message }: { message: ExtendedMessage; }) {
    const data = phantomMessageMap.get(message?.id) ?? message?.scheduledMessageData;
    if (!data) return null;

    const { scheduledTime } = data;
    const timeLeft = scheduledTime - Date.now();

    let timeLeftStr = "";
    if (timeLeft > 0) {
        const mins = Math.floor(timeLeft / 60000);
        const hrs = Math.floor(mins / 60);
        const days = Math.floor(hrs / 24);

        timeLeftStr = days > 0 ? ` (${days}d ${hrs % 24}h remaining)`
            : hrs > 0 ? ` (${hrs}h ${mins % 60}m remaining)`
                : ` (${mins}m remaining)`;
    }

    return (
        <div className={cl("accessory")}>
            <TimerIcon width={14} height={14} />
            <span>Scheduled for {new Date(scheduledTime).toLocaleString()}{timeLeftStr}</span>
        </div>
    );
}
