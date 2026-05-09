/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { SearchTab } from "./types";

export const MIN_QUERY_LENGTH = 2;
export const DEBOUNCE_MS = 300;
export const SCROLL_GAP_PX = 200;
export const SCROLL_SAVE_MS = 150;
export const HARD_LIMIT = 25;

export const TYPE_DM = 1;
export const TYPE_GROUP_DM = 3;

export const SEARCHABLE_TABS: SearchTab[] = ["messages", "media", "pins", "links", "files"];
