/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

interface Choice {
    key: number;
    value: any;
    label: string;
}

export default definePlugin({
    name: "DefaultStatusForever",
    description: "Make statuses default to last forever",
    authors: [Devs.ImLvna],

    patches: [
        {
            // hardcode default status duration to null
            find: "this.clearAfterOptions",
            replacement: {
                match: /(?<=value:)\i(?=,options:this.clearAfterOptions)/,
                replace: "null"
            }
        },
        {
            // reorder the list to put "Dont't Clear" at the top
            find: "get clearAfterOptions",
            replacement: {
                match: /(?<=get clearAfterOptions\(\){return).*?}]/,
                replace: " $self.patchChoices($&)"
            }
        }
    ],

    patchChoices(choices: Choice[]) {
        const nullChoice = choices.find(choice => choice.value === null);
        if (nullChoice) {
            choices.splice(choices.indexOf(nullChoice), 1);
            choices.unshift(nullChoice);
        }
        return choices;
    }
});
