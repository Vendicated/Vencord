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
    isElementFullScreen(windowId?: string | undefined): boolean;
    isFocused(windowId?: string | undefined): boolean;
    isVisible(windowId?: string | undefined): boolean;
    windowSize(windowId?: string | undefined): { height: number; width: number; };
}
