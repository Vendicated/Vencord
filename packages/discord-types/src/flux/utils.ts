/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Nullish } from "../internal";
import type { Store } from "./Store";

// For createFetchStore
export type FetchStoreFactory<
    StoreConstraint extends Store = Store,
    StateConstraint = unknown,
    DependenciesConstraint extends readonly unknown[] = readonly unknown[],
    IsLoadingConstraint extends boolean = boolean
> = <
    S extends StoreConstraint,
    State extends StateConstraint,
    Dependencies extends DependenciesConstraint,
    IsLoading extends IsLoadingConstraint
>(
    store: S,
    options: {
        dangerousAbortOnCleanup?: boolean | undefined /* = false */;
        get: (...dependencies: Dependencies) => State;
        getIsLoading: (...dependencies: Dependencies) => IsLoading;
        load: (signal: AbortSignal, ...dependencies: Dependencies) => Promise<void>;
        useStateHook: StoreStateHook<[S], State, Dependencies>;
    }
) => (...dependencies: Dependencies) => {
    data: State;
    error: unknown;
    isLoading: IsLoading;
};

// For useStateFromStores
export type StoreStateHook<
    Stores extends readonly Store[] = readonly Store[],
    StateConstraint = unknown,
    Dependencies extends readonly unknown[] | Nullish = readonly unknown[] | Nullish
> = <State extends StateConstraint>(
    stores: Stores,
    getStateFromStores: () => State,
    ...args: [
        ...undefined extends Dependencies
            ? [dependencies?: Dependencies]
            : [dependencies: Dependencies],
        areStatesEqual?: ((prevState: State, nextState: State) => boolean) | undefined
    ]
) => State;

// For useStateFromStoresObject
export type StoreObjectStateHook<
    Stores extends readonly Store[] = readonly Store[],
    StateConstraint extends {} = {},
    Dependencies extends readonly unknown[] | Nullish = readonly unknown[] | Nullish
> = <State extends StateConstraint>(
    stores: Stores,
    getStateFromStores: () => State,
    ...dependencies: undefined extends Dependencies
        ? [dependencies?: Dependencies]
        : [dependencies: Dependencies]
) => State;

// For useStateFromStoresArray
export type StoreArrayStateHook<
    Stores extends readonly Store[] = readonly Store[],
    StateConstraint extends readonly unknown[] = readonly unknown[],
    Dependencies extends readonly unknown[] | Nullish = readonly unknown[] | Nullish
> = <State extends StateConstraint>(
    stores: Stores,
    getStateFromStores: () => State,
    ...dependencies: undefined extends Dependencies
        ? [dependencies?: Dependencies]
        : [dependencies: Dependencies]
) => State;

// For statesWillNeverBeEqual
export type UnequatableStateComparator = () => false;
