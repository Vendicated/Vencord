/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { PKCache } from "@plugins/discordKit/utils";
import { OAuth2AuthorizeModal, openModal, RestAPI, showToast, Toasts, UserStore } from "@webpack/common";
import PKAPI, { SystemFetchOptions } from "pkapi.js";

import { PK } from ".";

// Modified from reviewDB/auth.tsx

export function authorize(callback: any) {
    openModal(props =>
        <OAuth2AuthorizeModal
            {...props}
            scopes={["guilds", "identify"]}
            responseType="code"
            redirectUri={PK.redirect}
            permissions={0n}
            clientId={PK.clientID}
            cancelCompletesFlow={false}
            callback={async (response: any) => {
                try {
                    const code = new URLSearchParams(response.location.split("?")[1]).get("code");
                    const req = await RestAPI.post({
                        url: PK.callback,
                        body: {
                            "code": code,
                            "redirect_domain": PK.dashboard
                        }
                    });

                    await callback(req.body.token);
                } catch (e) {
                    showToast((e as Error).message, Toasts.Type.FAILURE);
                }
            }}
        />
    );
}

export async function tryLogin(pkClient: PKAPI, cache: PKCache): Promise<boolean> {
    try {
        cache.system = await pkClient.getSystem(
            {
                system: "@me",
                fetch: ["config", "fronters", "group members", "groups", "members", "switches"] as SystemFetchOptions[],
                token: cache.token()
            }
        );

        cache.userId = UserStore.getCurrentUser()?.id;
        cache.isReady = true;

        showToast(`Succesfully logged into PluralKit: ${cache.system.id}`, Toasts.Type.SUCCESS);
        return true;
    } catch (e) {
        showToast((e as Error).message, Toasts.Type.FAILURE);
        return false;
    }
}
