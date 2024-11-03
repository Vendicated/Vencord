/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { useState } from "@webpack/common";
import { Embed } from "discord-types/general";

interface ToggleableDescriptionProps { embed: Embed, original: () => any; }

export default definePlugin({
    name: "YoutubeDescription",
    description: "Adds descriptions to youtube video embeds",
    authors: [Devs.arHSM],
    patches: [
        {
            find: "#{intl::SUPPRESS_ALL_EMBEDS}",
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
