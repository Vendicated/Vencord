/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { zustandCreate } from "plugins/decor";

interface BearState {
    bears: number;
    increase: (by: number) => void;
}

export const useBearStore = zustandCreate<BearState>(
    set => ({
        bears: 0,
        increase: by => set(state => ({ bears: state.bears + by })),
    })
);
