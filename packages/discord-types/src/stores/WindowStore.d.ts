/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ExtractAction, FluxAction } from "../flux";
import type { FluxStore } from "./abstract/FluxStore";

export type WindowStoreAction = ExtractAction<FluxAction, "WINDOW_FOCUS" | "WINDOW_FULLSCREEN_CHANGE" | "WINDOW_INIT" | "WINDOW_RESIZED" | "WINDOW_UNLOAD" | "WINDOW_VISIBILITY_CHANGE">;

export class WindowStore<Action extends FluxAction = WindowStoreAction> extends FluxStore<Action> {
    static displayName: "WindowStore";

    getFocusedWindowId(): string | null;
    getLastFocusedWindowId(): string | null;
    isElementFullScreen(windowId?: string | undefined): boolean;
    isFocused(windowId?: string | undefined): boolean;
    isVisible(windowId?: string | undefined): boolean;
    windowSize(windowId?: string | undefined): { height: number; width: number; };
}
