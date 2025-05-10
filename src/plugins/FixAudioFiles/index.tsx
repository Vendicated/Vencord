/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 prodbyeagle and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

let originalPlay: typeof Audio.prototype.play | null = null;
let last: HTMLAudioElement | null = null;

export default definePlugin({
    name: "FixAudioFiles",
    description: "Prevents overlapping audio by enforcing one 'sound' at a time.",
    authors: [Devs.eagle],

    start() {
        if (originalPlay) return;

        originalPlay = Audio.prototype.play;

        Audio.prototype.play = function (...args: any[]) {
            if (last && last !== this) {
                try {
                    last.pause();
                    last.dispatchEvent(new Event("pause"));
                    last.dispatchEvent(new Event("ended"));
                } catch { }
            }

            last = this as HTMLAudioElement;

            try {
                return originalPlay!.apply(this, args);
            } catch (e) {
                return Promise.reject(e);
            }
        };
    },

    stop() {
        if (!originalPlay) return;

        Audio.prototype.play = originalPlay;
        originalPlay = null;
        last = null;
    },
});
