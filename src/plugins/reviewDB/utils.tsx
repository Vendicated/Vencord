/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { classNameFactory } from "@api/Styles";
import { Logger } from "@utils/Logger";
import { openModal } from "@utils/modal";
import { findByProps } from "@webpack";
import { React, Toasts } from "@webpack/common";

import { Review, UserType } from "./entities";
import { settings } from "./settings";

export const cl = classNameFactory("vc-rdb-");

export function authorize(callback?: any) {
    const { OAuth2AuthorizeModal } = findByProps("OAuth2AuthorizeModal");

    openModal((props: any) =>
        <OAuth2AuthorizeModal
            {...props}
            scopes={["identify"]}
            responseType="code"
            redirectUri="https://manti.vendicated.dev/api/reviewdb/auth"
            permissions={0n}
            clientId="915703782174752809"
            cancelCompletesFlow={false}
            callback={async (response: any) => {
                try {
                    const url = new URL(response.location);
                    url.searchParams.append("clientMod", "vencord");
                    const res = await fetch(url, {
                        headers: new Headers({ Accept: "application/json" })
                    });
                    const { token, success } = await res.json();
                    if (success) {
                        settings.store.token = token;
                        showToast("Successfully logged in!");
                        callback?.();
                    } else if (res.status === 1) {
                        showToast("An Error occurred while logging in.");
                    }
                } catch (e) {
                    new Logger("ReviewDB").error("Failed to authorize", e);
                }
            }}
        />
    );
}

export function showToast(text: string) {
    Toasts.show({
        type: Toasts.Type.MESSAGE,
        message: text,
        id: Toasts.genId(),
        options: {
            position: Toasts.Position.BOTTOM
        },
    });
}

export function canDeleteReview(review: Review, userId: string) {
    return (
        review.sender.discordID === userId
        || settings.store.user?.type === UserType.Admin
    );
}
