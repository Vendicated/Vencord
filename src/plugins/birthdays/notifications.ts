/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { getUniqueUsername, openUserProfile } from "@utils/discord"; 
import { UserStore, UserUtils } from "@webpack/common";

import { daysUntil, getBirthdays, getUpcomingAge, getWritableNotifiedOn, startOfDay } from "./data";
import { settings } from "./settings";
import { Birthday } from "./types";

type NotificationKind = "day" | "reminder";

let running = false;

function toDayKey(date: Date) {
    const month = `${date.getMonth() + 1}`.padStart(2, "0"); 
    const day = `${date.getDate()}`.padStart(2, "0");

    return `${date.getFullYear()}-${month}-${day}`;
}

function fromDayKey(key: string) {
    const [year, month, day] = key.split("-").map(Number); 

    if (!year || !month || !day)
        return undefined;

    return new Date(year, month - 1, day);
}

function pruneRecords(notifiedOn: Record<string, string>, today: Date) {
    const cutoff = startOfDay(today).getTime() - 40 * 86_400_000;

    for (const [key, value] of Object.entries(notifiedOn)) {

        const date = fromDayKey(value);

        if (date == null || date.getTime() < cutoff) 
            delete notifiedOn[key];
    }
}

function buildBody(name: string, kind: NotificationKind, birthday: Birthday, days: number, today: Date) {
    const age = getUpcomingAge(birthday, today);

    if (kind === "day") {
        return age == null
            ? `It's ${name}'s birthday today! 🎂`
            : `It's ${name}'s birthday today! They're turning ${age}. 🎂`;
    }

    const when = days === 1 ? "tomorrow" : `in ${days} days`;

    return age == null
        ? `${name}'s birthday is ${when}. 🎂`
        : `${name}'s birthday is ${when}, they're turning ${age}. 🎂`;
}

function pickKind(days: number): NotificationKind | undefined {
    const { notifyOnDay, reminderDays } = settings.store;
 
    if (days === 0)
        return notifyOnDay ? "day" : undefined; 

    if (reminderDays > 0 && days === reminderDays)
        return "reminder";

    return undefined;
}

export async function runBirthdayCheck({ force = false } = {}) {
    if (running)
        return 0;

    if (UserStore.getCurrentUser() == null) 
        return 0;

    const notifiedOn = getWritableNotifiedOn();

    if (notifiedOn == null)
        return 0;

    running = true;

    try {
        const today = new Date();
        const todayKey = toDayKey(today);

        pruneRecords(notifiedOn, today);

        let notified = 0;

        for (const [userId, birthday] of Object.entries(getBirthdays())) {

            const days = daysUntil(birthday, today); 
            const kind = pickKind(days);

            if (kind == null) continue;

            const recordKey = `${userId}|${kind}`; 
            if (!force && notifiedOn[recordKey] === todayKey) continue;

            const user = UserStore.getUser(userId) ?? await UserUtils.getUser(userId).catch(() => void 0);
            if (user == null) continue;


            showNotification({
                title: kind === "day" ? "Birthday today 🎉" : "Upcoming birthday", 
                body: buildBody(getUniqueUsername(user), kind, birthday, days, today),
                icon: user.getAvatarURL(undefined, 128, false),
                onClick: () => { openUserProfile(user.id).catch(() => void 0); }
            });

            notifiedOn[recordKey] = todayKey;
            notified++;
 
        }

        return notified;
    } finally {
        running = false;
    }
}
