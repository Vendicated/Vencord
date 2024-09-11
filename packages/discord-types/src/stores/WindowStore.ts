/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Store } from "../flux/Store";

export declare class WindowStore extends Store {
    static displayName: "WindowStore";

    getFocusedWindowId(): string | null;
    getLastFocusedWindowId(): string | null;
    isElementFullScreen(windowId?: string): boolean;
    isFocused(windowId?: string): boolean;
    isVisible(windowId?: string): boolean;
    windowSize(windowId?: string): { height: number; width: number; };
}
