/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { GenericConstructor } from "../internal";
import type { PersistedStore } from "./PersistedStore";

export declare abstract class UserAgnosticStore<
    Constructor extends GenericConstructor = GenericConstructor,
    State = unknown
> extends PersistedStore<Constructor, State> {
    abstract getUserAgnosticState(): State;
}
