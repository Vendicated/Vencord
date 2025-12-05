/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { useEffect, useState } from "@webpack/common";

import { CalendarIcon } from "./Icons";
import { openViewScheduledModal } from "./ViewScheduledModal";

export let isScheduleModeEnabled = false;

const stateUpdaters = new Set<(value: boolean) => void>();

export function setScheduleModeEnabled(value: boolean): void {
    isScheduleModeEnabled = value;
    stateUpdaters.forEach(updater => updater(value));
}

export const ScheduledMessagesButton: ChatBarButtonFactory = ({ isMainChat }) => {
    const [enabled, setEnabled] = useState(isScheduleModeEnabled);

    useEffect(() => {
        stateUpdaters.add(setEnabled);
        return () => { stateUpdaters.delete(setEnabled); };
    }, []);

    if (!isMainChat) return null;

    const toggleScheduleMode = () => {
        const newValue = !enabled;
        setScheduleModeEnabled(newValue);
    };

    const tooltip = enabled
        ? "Schedule Mode ON (click to disable, right-click for list)"
        : "Schedule Mode OFF (click to enable, right-click for list)";

    return (
        <ChatBarButton
            tooltip={tooltip}
            onClick={toggleScheduleMode}
            onContextMenu={e => {
                e.preventDefault();
                openViewScheduledModal();
            }}
            buttonProps={{ "aria-haspopup": "dialog" }}
        >
            <CalendarIcon color={enabled ? "var(--status-positive)" : undefined} />
        </ChatBarButton>
    );
};
