/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated, ant0n, FieryFlames and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { UserStore } from "@webpack/common";

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
        description: "Max Super Reactions to play at once. 0 to disable playing Super Reactions",
        type: OptionType.SLIDER,
        default: 20,
        markers: [0, 5, 10, 20, 40, 60, 80, 100],
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
                match: /((\i)=\i=>{.{50,100})(\i\(\i,\i\))>=\i(?=.*BURST_REACTION_EFFECT_PLAY:\2)/,
                replace: "$1!$self.shouldPlayBurstReaction($3)"
            }
        },
        {
            find: ".EMOJI_PICKER_CONSTANTS_EMOJI_CONTAINER_PADDING_HORIZONTAL)",
            replacement: {
                match: /(openPopoutType:void 0(?=.+?isBurstReaction:(\i).+?(\i===\i\.\i.REACTION)).+?\[\2,\i\]=\i\.useState\().+?\)/,
                replace: (_, rest, isBurstReactionVariable, isReactionIntention) => `${rest}$self.shouldSuperReactByDefault&&${isReactionIntention})`
            }
        }
    ],
    settings,

    shouldPlayBurstReaction(playingCount: number) {
        if (settings.store.unlimitedSuperReactionPlaying) return true;
        if (settings.store.superReactionPlayingLimit === 0) return false;
        if (playingCount <= settings.store.superReactionPlayingLimit) return true;
        return false;
    },

    get shouldSuperReactByDefault() {
        return settings.store.superReactByDefault && UserStore.getCurrentUser().premiumType != null;
    }
});
