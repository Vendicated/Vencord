/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findByCodeLazy } from "@webpack";

export const create: typeof import("zustand").default = findByCodeLazy("will be removed in v4");
export const persist: typeof import("zustand/middleware").persist = findByCodeLazy("zustand persist middleware");
