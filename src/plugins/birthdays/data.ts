/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { UserStore } from "@webpack/common";

import { settings } from "./settings";
import { Birthday, UpcomingBirthday } from "./types";

export function isLeapYear(year: number) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(month: number, year?: number) {
    if (month === 2)
        return year == null || isLeapYear(year) ? 29 : 28;


    return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

export function isValidBirthday(birthday: Partial<Birthday>): birthday is Birthday {
    const { day, month, year } = birthday;

    if (!Number.isInteger(month) || month! < 1 || month! > 12)
        return false;

    if (!Number.isInteger(day) || day! < 1 || day! > daysInMonth(month!, year))
        return false;

    if (year != null && (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear())) 
        return false;

    return true;
}

export function startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function occurrenceInYear(birthday: Birthday, year: number) {
    if (birthday.month === 2 && birthday.day === 29 && !isLeapYear(year))
        return new Date(year, 2, 1);

    return new Date(year, birthday.month - 1, birthday.day);
}

export function nextOccurrence(birthday: Birthday, from = new Date()) {
    const today = startOfDay(from);
    const occurrence = occurrenceInYear(birthday, today.getFullYear());

    return occurrence < today
        ? occurrenceInYear(birthday, today.getFullYear() + 1)
        : occurrence;
}

export function daysUntil(birthday: Birthday, from = new Date()) {
    return Math.round((nextOccurrence(birthday, from).getTime() - startOfDay(from).getTime()) / 86_400_000);
}

export function getUpcomingAge(birthday: Birthday, from = new Date()) {
    if (birthday.year == null)
        return undefined;

    return nextOccurrence(birthday, from).getFullYear() - birthday.year; 
}

function getNamespace<T>(bucket: Record<string, Record<string, T>>, create: boolean) {
    const currentUserId = UserStore.getCurrentUser()?.id;

    if (currentUserId == null)
        return undefined;


    if (bucket[currentUserId] == null) {

        if (!create)
            return undefined;

        bucket[currentUserId] = {}; 
    }

    return bucket[currentUserId];
}

export function getBirthdays(): Record<string, Birthday> {
    return getNamespace(settings.store.birthdays, false) ?? {};
}

export function getWritableNotifiedOn() {
    return getNamespace(settings.store.notifiedOn, true);
}

export function getBirthday(userId: string): Birthday | undefined {
    return getBirthdays()[userId];
}

export function setBirthday(userId: string, birthday: Birthday) {
    const birthdays = getNamespace(settings.store.birthdays, true);
 
    if (birthdays == null)
        return;

    birthdays[userId] = birthday;
}

export function removeBirthday(userId: string) {
    const birthdays = getNamespace(settings.store.birthdays, true);
 
    if (birthdays == null)
        return;

    delete birthdays[userId];

    const notifiedOn = getWritableNotifiedOn();

    if (notifiedOn == null)
        return;

    delete notifiedOn[`${userId}|day`]; 
    delete notifiedOn[`${userId}|reminder`];
}

export function getUpcoming(from = new Date()): UpcomingBirthday[] {
    return Object.entries(getBirthdays())
        .map(([userId, birthday]) => ({ userId, birthday, days: daysUntil(birthday, from) }))
        .sort((a, b) => a.days - b.days);
}

export function getTodaysBirthdays(from = new Date()) {
    return getUpcoming(from).filter(({ days }) => days === 0);
}

export function getBirthdaysOn(date: Date) {
    const month = date.getMonth() + 1; 
    const day = date.getDate();

    return Object.entries(getBirthdays())
        .filter(([, birthday]) => {
            const occurrence = occurrenceInYear(birthday, date.getFullYear()); 
            return occurrence.getMonth() + 1 === month && occurrence.getDate() === day;
        })
        .map(([userId, birthday]) => ({ userId, birthday }));
}