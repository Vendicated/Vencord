/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { TimezoneAliasMap } from "./types";

const DEFAULT_TIMEZONE = "UTC";

const TIMEZONE_ALIASES: TimezoneAliasMap = {
    utc: "UTC",
    gmt: "UTC",
    uk: "Europe/London",
    london: "Europe/London",
    ldn: "Europe/London",
    bst: "Europe/London",
    sf: "America/Los_Angeles",
    "san francisco": "America/Los_Angeles",
    la: "America/Los_Angeles",
    pst: "America/Los_Angeles",
    pdt: "America/Los_Angeles",
    pt: "America/Los_Angeles",
    est: "America/New_York",
    edt: "America/New_York",
    et: "America/New_York",
    cst: "America/Chicago",
    cdt: "America/Chicago",
    ct: "America/Chicago",
    mst: "America/Denver",
    mdt: "America/Denver",
    mt: "America/Denver",
    tokyo: "Asia/Tokyo",
    japan: "Asia/Tokyo",
    cairo: "Africa/Cairo",
    egypt: "Africa/Cairo",
    seoul: "Asia/Seoul",
    korea: "Asia/Seoul",
    beijing: "Asia/Shanghai",
    shanghai: "Asia/Shanghai",
    china: "Asia/Shanghai",
    hk: "Asia/Hong_Kong",
    "hong kong": "Asia/Hong_Kong",
    singapore: "Asia/Singapore",
    "kuala lumpur": "Asia/Kuala_Lumpur",
    malaysia: "Asia/Kuala_Lumpur",
    jakarta: "Asia/Jakarta",
    indonesia: "Asia/Jakarta",
    bangkok: "Asia/Bangkok",
    thailand: "Asia/Bangkok",
    manila: "Asia/Manila",
    philippines: "Asia/Manila",
    taipei: "Asia/Taipei",
    taiwan: "Asia/Taipei",
    mumbai: "Asia/Kolkata",
    delhi: "Asia/Kolkata",
    kolkata: "Asia/Kolkata",
    ist: "Asia/Kolkata",
    india: "Asia/Kolkata",
    dubai: "Asia/Dubai",
    uae: "Asia/Dubai",
    riyadh: "Asia/Riyadh",
    saudi: "Asia/Riyadh",
    doha: "Asia/Qatar",
    qatar: "Asia/Qatar",
    moscow: "Europe/Moscow",
    russia: "Europe/Moscow",
    istanbul: "Europe/Istanbul",
    turkey: "Europe/Istanbul",
    paris: "Europe/Paris",
    france: "Europe/Paris",
    berlin: "Europe/Berlin",
    germany: "Europe/Berlin",
    rome: "Europe/Rome",
    italy: "Europe/Rome",
    madrid: "Europe/Madrid",
    spain: "Europe/Madrid",
    amsterdam: "Europe/Amsterdam",
    netherlands: "Europe/Amsterdam",
    stockholm: "Europe/Stockholm",
    sweden: "Europe/Stockholm",
    oslo: "Europe/Oslo",
    norway: "Europe/Oslo",
    helsinki: "Europe/Helsinki",
    finland: "Europe/Helsinki",
    athens: "Europe/Athens",
    greece: "Europe/Athens",
    lisbon: "Europe/Lisbon",
    portugal: "Europe/Lisbon",
    dublin: "Europe/Dublin",
    ireland: "Europe/Dublin",
    warsaw: "Europe/Warsaw",
    poland: "Europe/Warsaw",
    zurich: "Europe/Zurich",
    switzerland: "Europe/Zurich",
    prague: "Europe/Prague",
    czechia: "Europe/Prague",
    vienna: "Europe/Vienna",
    austria: "Europe/Vienna",
    nyc: "America/New_York",
    "new york": "America/New_York",
    boston: "America/New_York",
    miami: "America/New_York",
    atlanta: "America/New_York",
    toronto: "America/Toronto",
    ottawa: "America/Toronto",
    montreal: "America/Toronto",
    canada: "America/Toronto",
    chicago: "America/Chicago",
    dallas: "America/Chicago",
    houston: "America/Chicago",
    austin: "America/Chicago",
    denver: "America/Denver",
    phoenix: "America/Phoenix",
    vancouver: "America/Vancouver",
    seattle: "America/Los_Angeles",
    "los angeles": "America/Los_Angeles",
    brazil: "America/Sao_Paulo",
    "sao paulo": "America/Sao_Paulo",
    rio: "America/Sao_Paulo",
    "rio de janeiro": "America/Sao_Paulo",
    mexico: "America/Mexico_City",
    "mexico city": "America/Mexico_City",
    bogota: "America/Bogota",
    colombia: "America/Bogota",
    buenos: "America/Argentina/Buenos_Aires",
    "buenos aires": "America/Argentina/Buenos_Aires",
    argentina: "America/Argentina/Buenos_Aires",
    santiago: "America/Santiago",
    chile: "America/Santiago",
    lima: "America/Lima",
    peru: "America/Lima",
    auckland: "Pacific/Auckland",
    wellington: "Pacific/Auckland",
    nz: "Pacific/Auckland",
    "new zealand": "Pacific/Auckland",
    sydney: "Australia/Sydney"
    ,
    melbourne: "Australia/Melbourne",
    brisbane: "Australia/Brisbane",
    perth: "Australia/Perth",
    australia: "Australia/Sydney",
    johannesburg: "Africa/Johannesburg",
    southafrica: "Africa/Johannesburg",
    "south africa": "Africa/Johannesburg",
    lagos: "Africa/Lagos",
    nigeria: "Africa/Lagos",
    nairobi: "Africa/Nairobi",
    kenya: "Africa/Nairobi",
    casablanca: "Africa/Casablanca",
    morocco: "Africa/Casablanca"
};

let supportedTimezonesCache: Set<string> | null = null;

function getSupportedTimezones(): Set<string> {
    if (supportedTimezonesCache) return supportedTimezonesCache;

    try {
        const values = Intl.supportedValuesOf("timeZone");
        supportedTimezonesCache = new Set(values);
        return supportedTimezonesCache;
    } catch {
        supportedTimezonesCache = new Set<string>([
            "UTC",
            "Europe/London",
            "America/New_York",
            "America/Chicago",
            "America/Denver",
            "America/Los_Angeles",
            "Asia/Tokyo",
            "Europe/Berlin",
            "Europe/Paris",
            "Australia/Sydney"
        ]);
        return supportedTimezonesCache;
    }
}

function normalizeTimezoneToken(input: string): string {
    return input.trim().toLowerCase().replace(/\s+/g, " ");
}

function titleCaseTimezoneSegment(segment: string): string {
    return segment
        .toLowerCase()
        .split("_")
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join("_");
}

function normalizeIanaCandidate(input: string): string {
    const compact = input.trim().replace(/\s+/g, "_").replace(/\\/g, "/");
    if (!compact.includes("/")) return compact.toUpperCase();
    return compact
        .split("/")
        .map(titleCaseTimezoneSegment)
        .join("/");
}

export function resolveTimezone(input: string): string | null {
    const token = normalizeTimezoneToken(input);
    if (!token) return null;

    const alias = TIMEZONE_ALIASES[token];
    if (alias) return alias;

    const candidate = normalizeIanaCandidate(input);
    if (getSupportedTimezones().has(candidate)) return candidate;

    const fallback = Array.from(getSupportedTimezones()).find(zone => zone.toLowerCase().endsWith(`/${token.replace(/\s+/g, "_")}`));
    return fallback ?? null;
}

function getTimezoneDateParts(date: Date, timeZone: string): { year: number; month: number; day: number; hour: number; minute: number; second: number; } {
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });

    const parts = formatter.formatToParts(date);
    const get = (type: string) => Number(parts.find(part => part.type === type)?.value ?? 0);

    return {
        year: get("year"),
        month: get("month"),
        day: get("day"),
        hour: get("hour"),
        minute: get("minute"),
        second: get("second")
    };
}

function timezoneOffsetMinutes(timeZone: string, instant: Date): number {
    const parts = getTimezoneDateParts(instant, timeZone);
    const utcMs = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    return Math.round((utcMs - instant.getTime()) / 60000);
}

function wallClockToUtcMs(year: number, month: number, day: number, hour: number, minute: number, sourceTimezone: string): number {
    const base = Date.UTC(year, month - 1, day, hour, minute, 0);
    const baseDate = new Date(base);
    const offset = timezoneOffsetMinutes(sourceTimezone, baseDate);
    const guess = base - offset * 60000;
    const refinedOffset = timezoneOffsetMinutes(sourceTimezone, new Date(guess));
    return base - refinedOffset * 60000;
}

export function convertTimeBetweenTimezones(hour: number, minute: number, sourceTimezone: string, targetTimezone: string): { hour: number; minute: number; dayShift: number; } | null {
    const now = new Date();
    const sourceDate = getTimezoneDateParts(now, sourceTimezone);
    const utcMs = wallClockToUtcMs(sourceDate.year, sourceDate.month, sourceDate.day, hour, minute, sourceTimezone);
    const targetParts = getTimezoneDateParts(new Date(utcMs), targetTimezone);

    const sourceDayStamp = Date.UTC(sourceDate.year, sourceDate.month - 1, sourceDate.day, 0, 0, 0);
    const targetDayStamp = Date.UTC(targetParts.year, targetParts.month - 1, targetParts.day, 0, 0, 0);
    const dayShift = Math.round((targetDayStamp - sourceDayStamp) / 86400000);

    return {
        hour: targetParts.hour,
        minute: targetParts.minute,
        dayShift
    };
}

export function getNowInTimezone(timezone: string): { hour: number; minute: number; } {
    const parts = getTimezoneDateParts(new Date(), timezone);
    return { hour: parts.hour, minute: parts.minute };
}

export function getTimezoneDate(timezone: string): Date {
    const parts = getTimezoneDateParts(new Date(), timezone);
    return new Date(parts.year, parts.month - 1, parts.day);
}

export function normalizeTimezoneOrDefault(input: string): string {
    return resolveTimezone(input) ?? DEFAULT_TIMEZONE;
}

const TIMEZONE_COUNTRY: Record<string, string> = {
    UTC: "UTC",
    "Europe/London": "United Kingdom",
    "America/New_York": "United States",
    "America/Chicago": "United States",
    "America/Denver": "United States",
    "America/Los_Angeles": "United States",
    "Asia/Tokyo": "Japan",
    "Asia/Seoul": "South Korea",
    "Asia/Shanghai": "China",
    "Asia/Hong_Kong": "Hong Kong",
    "Asia/Singapore": "Singapore",
    "Asia/Kuala_Lumpur": "Malaysia",
    "Asia/Jakarta": "Indonesia",
    "Asia/Bangkok": "Thailand",
    "Asia/Manila": "Philippines",
    "Asia/Taipei": "Taiwan",
    "Asia/Kolkata": "India",
    "Asia/Dubai": "United Arab Emirates",
    "Asia/Riyadh": "Saudi Arabia",
    "Asia/Qatar": "Qatar",
    "Europe/Moscow": "Russia",
    "Europe/Istanbul": "Turkey",
    "Europe/Berlin": "Germany",
    "Europe/Paris": "France",
    "Europe/Rome": "Italy",
    "Europe/Madrid": "Spain",
    "Europe/Amsterdam": "Netherlands",
    "Europe/Stockholm": "Sweden",
    "Europe/Oslo": "Norway",
    "Europe/Helsinki": "Finland",
    "Europe/Athens": "Greece",
    "Europe/Lisbon": "Portugal",
    "Europe/Dublin": "Ireland",
    "Europe/Warsaw": "Poland",
    "Europe/Zurich": "Switzerland",
    "Europe/Prague": "Czechia",
    "Europe/Vienna": "Austria",
    "America/Toronto": "Canada",
    "America/Vancouver": "Canada",
    "America/Sao_Paulo": "Brazil",
    "America/Mexico_City": "Mexico",
    "America/Bogota": "Colombia",
    "America/Argentina/Buenos_Aires": "Argentina",
    "America/Santiago": "Chile",
    "America/Lima": "Peru",
    "Australia/Sydney": "Australia",
    "Australia/Melbourne": "Australia",
    "Australia/Brisbane": "Australia",
    "Australia/Perth": "Australia",
    "Pacific/Auckland": "New Zealand",
    "Africa/Johannesburg": "South Africa",
    "Africa/Lagos": "Nigeria",
    "Africa/Nairobi": "Kenya",
    "Africa/Casablanca": "Morocco",
    "Africa/Cairo": "Egypt"
};

export function getTimezoneCountryName(timezone: string): string | null {
    return TIMEZONE_COUNTRY[timezone] ?? null;
}
