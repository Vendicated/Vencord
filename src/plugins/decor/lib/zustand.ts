/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { filters, findByCodeLazy, findLazy } from "@webpack";

export const create: typeof import("zustand").default = findByCodeLazy("will be removed in v4");

const persistFilter = filters.byCode("zustand");
export const { persist }: typeof import("zustand/middleware") = findLazy(m => m.persist && persistFilter(m.persist));
