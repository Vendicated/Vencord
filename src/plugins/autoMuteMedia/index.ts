/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";


export default definePlugin({
    name: "AutoMuteMedia",
    authors: [Devs.sadan],
    description: "Mutes media by default",

    patches: [
        {
            find: "this.mediaRef",
            replacement: [
                // If this.props.autoMute is a function, it's called **every** time the media is played and sets the
                // current muted state to its return type.
                // Don't call it the first time the play button is clicked so our default is not overwritten
                {
                    match: /\i!==this\.state\.muted/,
                    replace: "this.state.hasClickedPlay && $&"
                },
                // when the play button is clicked, if it hasn't been clicked before discord sets the muted state to the default
                // overwrite the default to always be true
                {
                    match: /(?<=this\.setState\(\{[^}]+muted:)\(!!\i\|\|!\i\)&&\i/,
                    replace: "true"
                }
            ]
        }
    ]
});
