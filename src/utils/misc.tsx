/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Clipboard, Toasts } from "@webpack/common";

import { DevsById } from "./constants";

/**
 * Recursively merges defaults into an object and returns the same object
 * @param obj Object
 * @param defaults Defaults
 * @returns obj
 */
export function mergeDefaults<T>(obj: T, defaults: T): T {
    for (const key in defaults) {
        const v = defaults[key];
        if (typeof v === "object" && !Array.isArray(v)) {
            obj[key] ??= {} as any;
            mergeDefaults(obj[key], v);
        } else {
            obj[key] ??= v;
        }
    }
    return obj;
}

/**
 * Calls .join(" ") on the arguments
 * classes("one", "two") => "one two"
 */
export function classes(...classes: Array<string | null | undefined>) {
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
