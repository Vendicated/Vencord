/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { PersistedStore } from "../flux";
import type { GenericConstructor, Nullish } from "../internal";

export interface ThemeStoreState {
    theme: Theme;
}

export declare class ThemeStore<
    Constructor extends GenericConstructor = typeof ThemeStore,
    State extends ThemeStoreState = ThemeStoreState
> extends PersistedStore<Constructor, State> {
    static displayName: "ThemeStore";
    static persistKey: "ThemeStore";

    get darkSidebar(): boolean;
    getState(): State;
    initialize(state?: State | Nullish): void;
    get isSystemThemeAvailable(): boolean;
    get systemPrefersColorScheme(): Theme.DARK | Theme.LIGHT | undefined;
    /** Only null when `isSystemThemeAvailable` is false. */
    get systemTheme(): Theme.DARK | Theme.LIGHT | null;
    get theme(): Theme;
}

// Original name: Themes
export enum Theme {
    DARK = "dark",
    DARKER = "darker",
    LIGHT = "light",
    MIDNIGHT = "midnight",
}
