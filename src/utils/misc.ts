/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Clipboard, Toasts } from "@webpack/common";

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

export function copyWithToast(text: string, toastMessage = "Copied to clipboard!") {
    if (Clipboard.SUPPORTS_COPY) {
        Clipboard.copy(text);
    } else {
        toastMessage = "Your browser does not support copying to clipboard";
    }
    Toasts.show({
        message: toastMessage,
        id: Toasts.genId(),
        type: Toasts.Type.SUCCESS
    });
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

// https://developer.mozilla.org/en-US/docs/Web/HTTP/Browser_detection_using_the_user_agent#mobile_tablet_or_desktop
// "In summary, we recommend looking for the string Mobi anywhere in the User Agent to detect a mobile device."
export const isMobile = navigator.userAgent.includes("Mobi");

export const isPluginDev = (id: string) => Object.hasOwn(DevsById, id);

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
