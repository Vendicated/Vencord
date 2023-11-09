/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated, ant0n, FieryFlames and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    superReactByDefault: {
        type: OptionType.BOOLEAN,
        description: "Reaction picker will default to Super Reactions",
        default: true,
    },
    unlimitedSuperReactionPlaying: {
        type: OptionType.BOOLEAN,
        description: "Remove the limit on Super Reactions playing at once",
        default: false,
    },

    superReactionPlayingLimit: {
        description: "Max Super Reactions to play at once",
        type: OptionType.SLIDER,
        default: 20,
        markers: [5, 10, 20, 40, 60, 80, 100],
        stickToMarkers: true,
    },
}, {
    superReactionPlayingLimit: {
        disabled() { return this.store.unlimitedSuperReactionPlaying; },
    }
});

export default definePlugin({
    name: "SuperReactionTweaks",
    description: "Customize the limit of Super Reactions playing at once, and super react by default",
    authors: [Devs.FieryFlames, Devs.ant0n],
    patches: [
        {
            find: ",BURST_REACTION_EFFECT_PLAY",
            replacement: {
                match: /(?<=BURST_REACTION_EFFECT_PLAY:\i=>{.{50,100})(\i\(\i,\i\))>=\d+/,
                replace: "!$self.shouldPlayBurstReaction($1)"
            }
        },
        {
            find: ".hasAvailableBurstCurrency)",
            replacement: {
                match: /(?<=\.useBurstReactionsExperiment.{0,20})useState\(!1\)(?=.+?(\i===\i\.EmojiIntention.REACTION))/,
                replace: "useState($self.settings.store.superReactByDefault && $1)"
            }
        }
    ],
    settings,

    shouldPlayBurstReaction(playingCount: number) {
        if (settings.store.unlimitedSuperReactionPlaying) return true;
        if (playingCount <= settings.store.superReactionPlayingLimit) return true;
        return false;
    }
});
