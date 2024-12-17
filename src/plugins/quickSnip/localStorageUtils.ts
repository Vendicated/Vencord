/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { localStorage } from "@utils/localStorage";
import { UserStore } from "@webpack/common";

export interface Snippet {
    name: string;
    value: string;
}

const SNIPPETS_KEY = "quickSnip_snippets";

/**
 * Retrieves snippets from localStorage.
 * Returns an array of Snippet objects.
 */
export function getSnippets(): Snippet[] {
    const snippetsJSON = localStorage.getItem(SNIPPETS_KEY);
    if (snippetsJSON) {
        try {
            const parsed = JSON.parse(snippetsJSON);
            if (Array.isArray(parsed)) {
                // Validate that each item has 'name' and 'value'
                return parsed.filter(
                    (snippet: any) =>
                        typeof snippet.name === "string" &&
                        typeof snippet.value === "string"
                );
            }
            return [];
        } catch (e) {
            console.error("Failed to parse snippets from localStorage:", e);
            return [];
        }
    }
    // Return default snippets if none are saved
    return [
        { name: "greet", value: "Hello there!" },
        { name: "bye", value: "Goodbye!" },
        { name: "thanks", value: "Thank you!" }
    ];
}

/**
 * Saves snippets to localStorage.
 * @param snippets Array of Snippet objects to save.
 */
export function saveSnippets(snippets: Snippet[]): void {
    try {
        const snippetsJSON = JSON.stringify(snippets);
        localStorage.setItem(SNIPPETS_KEY, snippetsJSON);
    } catch (e) {
        console.error("Failed to save snippets to localStorage:", e);
    }
}

/**
 *
 * @returns The username of the current user, or undefined if not logged in.
 */
export function getMyUsername(): string {
    const user = UserStore.getCurrentUser();
    return user.username;
}

/**
 *
 * @returns The ID of the current user, or undefined if not logged in.
 */
export function getMyId(): string | undefined {
    const data = JSON.parse(localStorage.getItem("MultiAccountStore") || "{}") as Record<string, any>;
    return data._state?.users?.[0]?.id;
}
