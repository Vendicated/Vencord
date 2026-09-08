/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Span } from "@components/Span";
import { getTodaysBirthdays } from "@plugins/birthdays/data";
import { settings } from "@plugins/birthdays/settings";
import { cl } from "@plugins/birthdays/utils";
import { useTimer } from "@utils/react";

import { openBirthdayCalendarModal } from "./BirthdayCalendarModal";
import { GiftIcon } from "./icons";

export function BirthdayNavButton() {
    settings.use(["birthdays"]);
    useTimer({ interval: 60_000 });

    const count = getTodaysBirthdays().length;

    return (
        <div className={cl("nav-wrapper")}>
            <button
                className={cl("nav-item")}
                onClick={() => openBirthdayCalendarModal()}
            >
                <GiftIcon size="refresh_sm" color="currentColor" className={cl("nav-icon")} /> 
                <Span size="md" weight="medium" defaultColor={false} className={cl("nav-label")}>Birthdays</Span> 
                {count > 0 && (
                    <Span size="xs" weight="bold" defaultColor={false} className={cl("nav-badge")}>{count > 99 ? "99+" : count}</Span>
                )}
            </button>
        </div>
    );
}