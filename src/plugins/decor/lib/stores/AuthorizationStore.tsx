/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { proxyLazy } from "@utils/lazy";
import { Logger } from "@utils/Logger";
import { openModal } from "@utils/modal";
import { OAuth2AuthorizeModal, showToast, Toasts, UserStore, zustandCreate, zustandPersist } from "@webpack/common";

import { AUTHORIZE_URL, CLIENT_ID } from "../constants";

interface AuthorizationState {
    token: string | null;
    tokens: Record<string, string>;
    init: () => void;
    authorize: () => Promise<void>;
    setToken: (token: string) => void;
    remove: (id: string) => void;
    isAuthorized: () => boolean;
}

const indexedDBStorage = {
    async getItem(name: string) {
        return await DataStore.get<string>(name) ?? null;
    },
    async setItem(name: string, value: string) {
        await DataStore.set(name, value);
    },
    async removeItem(name: string) {
        await DataStore.del(name);
    },
};

// TODO: Move switching accounts subscription inside the store?
export const useAuthorizationStore: {
    (): AuthorizationState;
    getState: () => AuthorizationState;
    subscribe: (handler: (state: AuthorizationState) => void) => () => void;
} = proxyLazy(() => zustandCreate(
    zustandPersist(
        (set: any, get: any): AuthorizationState => ({
            token: null,
            tokens: {},
            init: () => { set({ token: get().tokens[UserStore.getCurrentUser()!.id] ?? null }); },
            setToken: (token: string) => set({ token, tokens: { ...get().tokens, [UserStore.getCurrentUser()!.id]: token } }),
            remove: (id: string) => {
                const { tokens, init } = get();
                const newTokens = { ...tokens };
                delete newTokens[id];
                set({ tokens: newTokens });

                init();
            },
            authorize: async () => new Promise((resolve, reject) => {
                openModal(props => (
                    <OAuth2AuthorizeModal
                        {...props}
                        scopes={["identify"]}
                        responseType="code"
                        redirectUri={AUTHORIZE_URL}
                        permissions={0n}
                        clientId={CLIENT_ID}
                        cancelCompletesFlow={false}
                        callback={async (response: any) => {
                            try {
                                const url = new URL(response.location);
                                url.searchParams.append("client", "vencord");

                                const req = await fetch(url);

                                if (req.ok) {
                                    const token = await req.text();
                                    get().setToken(token);
                                } else {
                                    throw new Error("Request not OK");
                                }
                                resolve(undefined);
                            } catch (e) {
                                if (e instanceof Error) {
                                    showToast(`Failed to authorize: ${e.message}`, Toasts.Type.FAILURE);
                                    new Logger("Decor").error("Failed to authorize", e);
                                    reject(e);
                                }
                            }
                        }}
                    />
                ), {
                    onCloseCallback() {
                        reject(new Error("Authorization cancelled"));
                    },
                });
            }),
            isAuthorized: () => !!get().token,
        }),
        {
            name: "decor-auth",
            getStorage: () => indexedDBStorage,
            partialize: (state: AuthorizationState) => ({ tokens: state.tokens }),
            onRehydrateStorage: () => (state?: AuthorizationState) => { state?.init(); }
        }
    )
));
