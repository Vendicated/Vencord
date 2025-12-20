/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DevsById } from "./constants";

/**
 * Calls .join(" ") on the arguments
 * classes("one", "two") => "one two"
 */
export function classes(...classes: Array<string | null | undefined | false>) {
    return classes.filter(Boolean).join(" ");
}

/**
 * Returns a promise that resolves after the specified amount of time
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
}

/**
 * Check if obj is a true object: of type "object" and not null or array
 */
export function isObject(obj: unknown): obj is object {
    return typeof obj === "object" && obj !== null && !Array.isArray(obj);
}

/**
 * Check if an object is empty or in other words has no own properties
 */
export function isObjectEmpty(obj: object) {
    for (const k in obj)
        if (Object.hasOwn(obj, k)) return false;

    return true;
}

/**
 * Returns null if value is not a URL, otherwise return URL object.
 * Avoids having to wrap url checks in a try/catch
 */
export function parseUrl(urlString: string): URL | null {
    try {
        return new URL(urlString);
    } catch {
        return null;
    }
}

/**
 * Checks whether an element is on screen
 */
export const checkIntersecting = (el: Element) => {
    const elementBox = el.getBoundingClientRect();
    const documentHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
    return !(elementBox.bottom < 0 || elementBox.top - documentHeight >= 0);
};

export function identity<T>(value: T): T {
    return value;
}

export const isPluginDev = (id: string) => Object.hasOwn(DevsById, id);
export const shouldShowContributorBadge = (id: string) => isPluginDev(id) && DevsById[id].badge !== false;

export function pluralise(amount: number, singular: string, plural = singular + "s") {
    return amount === 1 ? `${amount} ${singular}` : `${amount} ${plural}`;
}

export function interpolateIfDefined(strings: TemplateStringsArray, ...args: any[]) {
    if (args.some(arg => arg == null)) return "";
    return String.raw({ raw: strings }, ...args);
}

export function tryOrElse<T>(func: () => T, fallback: T): T {
    try {
        const res = func();
        return res instanceof Promise
            ? res.catch(() => fallback) as T
            : res;
    } catch {
        return fallback;
    }
}
