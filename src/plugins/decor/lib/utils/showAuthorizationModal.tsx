/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { openModal } from "@utils/modal";
import { findByPropsLazy } from "@webpack";

import { AUTHORIZE_URL, CLIENT_ID } from "../constants";
import { useAuthorizationStore } from "../stores/AuthorizationStore";

const OAuth = findByPropsLazy("OAuth2AuthorizeModal");

export default () => openModal(props =>
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
                    const token = await req.text();
                    useAuthorizationStore.getState().setToken(token);
                } else {
                    throw new Error("Request not OK");
                }
            } catch (e) {
                new Logger("Decor").error("Failed to authorize", e);
            }
        }}
    />
);
