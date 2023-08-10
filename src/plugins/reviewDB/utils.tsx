/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
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
