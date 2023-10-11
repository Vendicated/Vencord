/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { Logger } from "@utils/Logger";
import { openModal } from "@utils/modal";
import { findByPropsLazy } from "@webpack";
import { UserStore } from "@webpack/common";

import { API_URL } from "./api";
import { CLIENT_ID } from "./constants";

const DATA_STORE_KEY = "decor-auth";

const AUTHORIZE_URL = API_URL + "/authorize";
const OAuth = findByPropsLazy("OAuth2AuthorizeModal");

export let token: string | null = null;

export const isAuthorized = () => !!token;

export async function initAuth() {
    token = await getToken() ?? null;
}

export async function getToken(): Promise<string | undefined> {
    const auth = await DataStore.get(DATA_STORE_KEY);
    return auth?.[UserStore.getCurrentUser()?.id];
}

export async function updateToken(newToken: string) {
    return DataStore.update(DATA_STORE_KEY, auth => {
        auth ??= {};
        auth[UserStore.getCurrentUser().id] = newToken;

        token = newToken;

        return auth;
    });
}

export function authorize(callback?: any) {
    openModal(props =>
        <OAuth.OAuth2AuthorizeModal
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

                    if (req?.ok) {
                        updateToken(await req.text());
                    } else {
                        throw new Error("Request not OK");
                    }
                } catch (e) {
                    new Logger("Decor").error("Failed to authorize", e);
                }
            }}
        />
    );
}
