/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { openModal } from "@utils/modal";
import { OAuth2AuthorizeModal, showToast, Toasts } from "@webpack/common";

import { apiConstants, authFetch, getData } from "./api";
import { useAuthorizationStore } from "./store/AuthorizationStore";

export function presentOAuth2Modal() {
    openModal(props => (
        <OAuth2AuthorizeModal
            {...props}
            scopes={["applications.commands", "identify"]}
            responseType="code"
            redirectUri={apiConstants.oauth2.redirectURL}
            permissions={0n}
            clientId={apiConstants.oauth2.clientId}
            cancelCompletesFlow={false}
            callback={async ({ location }) => {
                if (!location) return;
                try {
                    const url = new URL(location);
                    url.searchParams.append("whois", "vencord");

                    const token = await (await authFetch(url))?.text();
                    if (!token) return;

                    useAuthorizationStore.getState().setToken(token);
                    getData();

                    showToast("Successfully authorized!", Toasts.Type.SUCCESS);
                } catch {
                    // handled in authFetch
                }
            }}
        />
    ));
}
