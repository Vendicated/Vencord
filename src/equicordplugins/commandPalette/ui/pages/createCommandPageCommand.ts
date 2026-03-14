/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { CommandEntry } from "../../registry";
import type { PalettePageRef } from "./types";

type CreateCommandPageCommandInput = Omit<CommandEntry, "handler" | "page"> & {
    page: PalettePageRef;
};

export function createCommandPageCommand(input: CreateCommandPageCommandInput): CommandEntry {
    return {
        ...input,
        page: input.page,
        handler: () => undefined
    };
}
