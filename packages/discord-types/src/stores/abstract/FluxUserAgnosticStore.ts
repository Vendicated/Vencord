/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { GenericConstructor } from "../../internal";
import type { FluxPersistedStore } from "./FluxPersistedStore";

// Original name: UserAgnosticStore
export declare abstract class FluxUserAgnosticStore<
    Constructor extends GenericConstructor = GenericConstructor,
    State = unknown
> extends FluxPersistedStore<Constructor, State> {
    abstract getUserAgnosticState(): State;
}
