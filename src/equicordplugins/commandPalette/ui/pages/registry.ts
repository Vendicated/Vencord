/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import scheduledCreatePageSpec from "./specs/scheduledCreatePage";
import sendDmPageSpec from "./specs/sendDmPage";
import statusTimerPageSpec from "./specs/statusTimerPage";
import type { PalettePageId, PalettePageSpec } from "./types";

const pageSpecs = new Map<PalettePageId, PalettePageSpec>([
    [sendDmPageSpec.id, sendDmPageSpec],
    [scheduledCreatePageSpec.id, scheduledCreatePageSpec],
    [statusTimerPageSpec.id, statusTimerPageSpec]
]);

export function getPalettePageSpec(id: PalettePageId): PalettePageSpec | undefined {
    return pageSpecs.get(id);
}
