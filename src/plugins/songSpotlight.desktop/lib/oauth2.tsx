/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { openModal } from "@utils/modal";
import { ApplicationIntegrationType } from "@vencord/discord-types/enums";
import { OAuth2AuthorizeModal, showToast, Toasts } from "@webpack/common";

import { apiConstants, authFetch, getData } from "./api";
import { useAuthorizationStore } from "./store/AuthorizationStore";

export function presentOAuth2Modal() {
    openModal(props => (
        <OAuth2AuthorizeModal
            {...props}
            clientId={apiConstants.oauth2.clientId}
            scopes={["applications.commands", "identify"]}
            integrationType={ApplicationIntegrationType.USER_INSTALL}
            permissions={0n}
            responseType="code"
            redirectUri={apiConstants.oauth2.redirectURL}
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
