/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, migratePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Embed } from "@vencord/discord-types";
import { useState } from "@webpack/common";

interface ToggleableDescriptionProps { embed: Embed, original: () => any; }

const settings = definePluginSettings({
    youtubeDescription: {
        description: "Adds descriptions to youtube video embeds",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: true
    }
});

migratePluginSettings("FixYoutubeEmbeds", "YoutubeDescription");

export default definePlugin({
    name: "FixYoutubeEmbeds",
    description: "Bypasses youtube videos being blocked from display on Discord (for example by UMG)",
    authors: [Devs.coolelectronics, Devs.arHSM],
    settings,
    patches: [
        {
            find: "#{intl::SUPPRESS_ALL_EMBEDS}",
            predicate: () => settings.store.youtubeDescription,
            replacement: {
                match: /case (\i\.\i\.VIDEO):(case \i\.\i\.\i:)*break;default:(\i)=(?:(this\.renderDescription)\(\))\}/,
                replace: "$2 break; case $1: $3 = $self.ToggleableDescriptionWrapper({ embed: this.props.embed, original: $4.bind(this) }); break; default: $3 = $4() }"
            }
        }
    ],
    ToggleableDescription: ErrorBoundary.wrap(({ embed, original }: ToggleableDescriptionProps) => {
        const [isOpen, setOpen] = useState(false);

        if (!embed.rawDescription)
            return null;
        if (embed.rawDescription.length <= 20)
            return original();

        return (
            <div
                style={{ cursor: "pointer", marginTop: isOpen ? "0px" : "8px" }}
                onClick={() => setOpen(o => !o)}
            >
                {isOpen
                    ? original()
                    : embed.rawDescription.substring(0, 20) + "..."}
            </div>
        );
    }),
    ToggleableDescriptionWrapper(props: ToggleableDescriptionProps) {
        return <this.ToggleableDescription {...props} ></this.ToggleableDescription >;
    }
});
