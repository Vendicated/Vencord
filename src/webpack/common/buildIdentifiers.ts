/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { makeLazy } from "@utils/lazy";
import { findModuleFactory } from "@webpack";

export const spreadEnabled = makeLazy(() => {
    const tooltipsFactory = findModuleFactory("tooltipTop,bottom:");
    if (tooltipsFactory == null) {
        return true;
    }

    return String(tooltipsFactory).includes('="div",...');
});
