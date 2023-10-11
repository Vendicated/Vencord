/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { proxyLazy } from "@utils/lazy";

import showAuthorizationModal from "../utils/showAuthorizationModal";
import { create } from "../zustand";

// TODO: Persist token in DataStore

interface AuthorizationState {
    token: string | null;
    init: () => void;
    authorize: () => void;
}

export const useAuthorizationStore = proxyLazy(() => create<AuthorizationState>(
    set => ({
        token: null,
        init: () => { },
        authorize: showAuthorizationModal
    })
));
