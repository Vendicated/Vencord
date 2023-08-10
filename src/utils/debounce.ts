/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * Returns a new function that will call the wrapped function
 * after the specified delay. If the function is called again
 * within the delay, the timer will be reset.
 * @param func The function to wrap
 * @param delay The delay in milliseconds
 */
export function debounce<T extends Function>(func: T, delay = 300): T {
    let timeout: NodeJS.Timeout;
    return function (...args: any[]) {
        clearTimeout(timeout);
        timeout = setTimeout(() => { func(...args); }, delay);
    } as any;
}
