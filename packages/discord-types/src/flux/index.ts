/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { FluxPersistedStore } from "../stores/abstract/FluxPersistedStore";
import type { FluxStore } from "../stores/abstract/FluxStore";
import type { FluxUserAgnosticStore } from "../stores/abstract/FluxUserAgnosticStore";
import type { FluxEmitter } from "./FluxEmitter";

export * from "./FluxActionHandlersGraph";
export * from "./FluxActionLog";
export * from "./FluxActionLogger";
export * from "./fluxActions";
export * from "./FluxBatchedStoreListener";
export * from "./FluxChangeListeners";
export * from "./FluxDispatcher";
export * from "./FluxEmitter";

export interface Flux {
    get initialized(): typeof FluxStore["initialized"];

    /** @todo */
    connectStores: (a?: any, b?: any, c?: any) => (a?: any) => any;
    DeviceSettingsStore: typeof FluxUserAgnosticStore;
    Emitter: FluxEmitter;
    initialize: typeof FluxStore["initialize"];
    OfflineCacheStore: typeof FluxUserAgnosticStore;
    PersistedStore: typeof FluxPersistedStore;
    Store: typeof FluxStore;
}
