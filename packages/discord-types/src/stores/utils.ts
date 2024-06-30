/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Nullish } from "../internal";
import type { FluxStore } from "./abstract/FluxStore";

export type UseStateFromStoresHook = <State>(
    stores: FluxStore[],
    getStateFromStores: () => State,
    dependencies?: unknown[] | Nullish,
    areStatesEqual?: ((prevState: State, currState: State) => boolean) | undefined
) => State;

export type UseStateFromStoresArrayHook = <State extends unknown[]>(
    stores: FluxStore[],
    getStateFromStores: () => State,
    dependencies?: unknown[] | Nullish
) => State;

export type UseStateFromStoresObjectHook = <State extends object>(
    stores: FluxStore[],
    getStateFromStores: () => State,
    dependencies?: unknown[] | Nullish
) => State;
