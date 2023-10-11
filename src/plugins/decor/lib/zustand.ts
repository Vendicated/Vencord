/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export let create: typeof import("zustand").default;
export const setCreate = (e: any) => { create = e; };
