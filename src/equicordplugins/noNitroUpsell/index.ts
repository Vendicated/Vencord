/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { UserStore } from "@webpack/common";
import { User } from "discord-types/general";

let user: ModifiedUser | undefined;
let lastUserId: string | undefined;
let uninject: (() => void) | undefined;

interface ModifiedUser extends User {
    _realPremiumType?: number;
}

export default definePlugin({
    name: "NoNitroUpsell",
    description: "Removes ALL of Discord's nitro upsells by tricking the client into thinking you have nitro.",
    authors: [EquicordDevs.thororen],
    ready(user: ModifiedUser): void {
        if (!user) return;
        if ("_realPremiumType" in user) return;

        user._realPremiumType = user.premiumType ?? 0;
        user.premiumType = 2;
        lastUserId = user.id;
    },
    start(): void {
        user = UserStore.getCurrentUser();
        if (user) this.ready(user);

        const onChange = (): void => {
            const newUser = UserStore.getCurrentUser();
            if (newUser && newUser.id !== lastUserId) {
                user = newUser;
                this.ready(user);
            }
        };

        UserStore.addChangeListener(onChange);
        uninject = () => UserStore.removeChangeListener(onChange);
    },
    stop(): void {
        uninject?.();
        const user = UserStore.getCurrentUser();
        if (!user) return;
        if (!("_realPremiumType" in user)) return;
        UserStore?.getCurrentUser()?.premiumType;
        // @ts-ignore
        user.premiumType = user._realPremiumType;
        delete user._realPremiumType;
    }
});
