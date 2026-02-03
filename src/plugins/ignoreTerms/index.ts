/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "IgnoreTerms",
    description: "Ignore Discord's new terms of service",
    authors: [{
        name: "rz30",
        id: 786315593963536415n
    }, {
        name: "l2cu",
        id: 1208352443512004648n
}],
    patches: [
        {
            find: "#{intl::NEW_TERMS_TITLE}",
            replacement: {
                match: /function (\i)\((\i)\)\{let\{transitionState:(\i)\}=(\i)/g,
                replace: "function $1($2){return $self.closeModal($2);let{transitionState:$3}=$4"
            }
        }
    ],

    closeModal(event) {
        event.transitionState = null;
        event.onClose();
        return null;
    }
});
