/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Paragraph } from "@components/Paragraph";
import { getBirthdays } from "@plugins/birthdays/data";
import { runBirthdayCheck } from "@plugins/birthdays/notifications";
import { settings } from "@plugins/birthdays/settings";
import { cl } from "@plugins/birthdays/utils";
import { Margins } from "@utils/margins";
import { showToast, Toasts, useState } from "@webpack/common";

import { openBirthdayCalendarModal } from "./BirthdayCalendarModal";

export function SettingsPanel() {
    settings.use(["birthdays"]);

    const [checking, setChecking] = useState(false);

    const count = Object.keys(getBirthdays()).length;

    async function checkNow() {
        setChecking(true);
        try {
            const notified = await runBirthdayCheck({ force: true });
            showToast(
                notified === 0
                    ? "No birthdays to notify about right now"
                    : `Sent ${notified} notification${notified === 1 ? "" : "s"}`,
                notified === 0 ? Toasts.Type.MESSAGE : Toasts.Type.SUCCESS
            );
        } finally {
            setChecking(false);
        }
    }

    return (
        <div className={Margins.bottom20}>
            <Paragraph className={Margins.bottom8}>
                {count === 0
                    ? "No birthdays saved yet. Right click someone and pick Set Birthday to add one."
                    : `${count} birthday${count === 1 ? "" : "s"} saved.`}
            </Paragraph>

            <div className={cl("settings-actions")}>
                <Button onClick={() => openBirthdayCalendarModal()}>
                    Open calendar
                </Button>

                <Button variant="secondary" disabled={checking} onClick={checkNow}>
                    Send notifications now
                </Button>
            </div>
        </div>
    );
}
