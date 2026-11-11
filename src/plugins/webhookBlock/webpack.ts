/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findCssClassesLazy } from "@webpack";

export const utilClasses = findCssClassesLazy("title", "description", "container", "disabled", "header");
export const blockedClasses = findCssClassesLazy("card", "usersList", "row", "userInfo", "text");
