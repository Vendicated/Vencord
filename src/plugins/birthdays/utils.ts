/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@utils/css";
import { moment } from "@webpack/common";

import { getUpcomingAge } from "./data";
import { Birthday } from "./types";

export const cl = classNameFactory("vc-birthdays-");

export function formatBirthday(birthday: Birthday) {
    return moment(new Date(2000, birthday.month - 1, birthday.day)).format("D MMMM");
}

export function formatRelative(days: number) {
    if (days === 0) return "Today"; 
    if (days === 1) return "Tomorrow";

    return `in ${days} days`;
}

export function formatUpcomingAge(birthday: Birthday) {
    const age = getUpcomingAge(birthday);
    return age == null ? undefined : `turns ${age}`;
}