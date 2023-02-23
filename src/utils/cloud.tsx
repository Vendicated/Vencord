/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import * as DataStore from "@api/DataStore";
import { findByProps } from "@webpack";
import { Toasts, UserStore } from "@webpack/common";

import { Settings } from "../Vencord";
import Logger from "./Logger";
import { openModal } from "./modal";

export const cloudLogger = new Logger("Cloud", "#39b7e0");

const toast = (type: number, message: string) =>
    Toasts.show({
        type,
        message,
        id: Toasts.genId(),
        options: {
            position: Toasts.Position.BOTTOM
        }
    });

export async function cloudConfigured() {
    return await DataStore.get("Vencord_cloudSecret") !== undefined;
}

export async function authorizeCloud() {
    if (await cloudConfigured()) return;

    const { OAuth2AuthorizeModal } = findByProps("OAuth2AuthorizeModal");

    openModal((props: any) => <OAuth2AuthorizeModal
        {...props}
        scopes={["identify"]}
        responseType="code"
        redirectUri="https://vencord.vendicated.dev/api/v1/callback"
        permissions={0n}
        clientId="1075583776979169361"
        cancelCompletesFlow={false}
        callback={async (u: string) => {
            if (!u) {
                Settings.backend.enabled = false;
                return;
            }

            try {
                const res = await fetch(u, {
                    headers: new Headers({ Accept: "application/json" })
                });
                const { secret } = await res.json();
                if (secret) {
                    cloudLogger.info("Authorized with secret");
                    await DataStore.set("Vencord_cloudSecret", secret);
                    toast(Toasts.Type.SUCCESS, "Cloud enabled!");
                } else {
                    toast(Toasts.Type.FAILURE, "Setup failed (no secret returned?).");
                }
            } catch (e: any) {
                cloudLogger.error("Failed to authorize", e);
                toast(Toasts.Type.FAILURE, `Setup failed (${e.toString()}).`);
                Settings.backend.enabled = false;
            }
        }
        }
    />);
}

export async function getCloudAuth() {
    const userId = UserStore.getCurrentUser().id;
    const secret = await DataStore.get("Vencord_cloudSecret");

    return btoa(`${userId}:${secret}`);
}
