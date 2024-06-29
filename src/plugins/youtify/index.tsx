/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./youtify.css";

import { addAccessory } from "@api/MessageAccessories";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants.js";
import { classes } from "@utils/misc";
import { useAwaiter } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";

async function youtuberify(link: string): Promise<string | undefined> {
    if (link.includes("playlist")) {
        return;
    }
    return await fetch(`https://youtuber.exhq.workers.dev/${link}`).then(it => it.text());
}

const settings = definePluginSettings({
    useInvidious: {
        description: "use invidious instance instead of youtube",
        type: OptionType.BOOLEAN,
        default: false
    },
    invidiousLink: {
        description: "your invidious instance's domain",
        type: OptionType.STRING,
        default: "vid.puffyan.us"
    },
});

function replaceYouTubeURL(originalURL: string, newDomain: string): string {
    const youtubeRegex = /https?:\/\/(?:www\.)?youtube\.com/i;
    if (youtubeRegex.test(originalURL)) {
        const replacedURL = originalURL.replace(youtubeRegex, newDomain);
        return "https://" + replacedURL;
    } else {
        throw new Error("The provided URL is not a YouTube link.");
    }
}

export default definePlugin({
    name: "youtify",
    description: "gives you the youtube linnk of a spotify song",
    authors: [Devs.echo],
    dependencies: ["MessageAccessoriesAPI"],
    patches: [
        {
            find: ".embedCard",
            replacement: [{
                match: /function (\i)\(\i\){var \i=\i\.message,\i=\i\.channel.{0,200}\.hideTimestamp/,
                replace: "$self.AutoModEmbed=$1;$&"
            }]
        }
    ],
    settings,

    start() {
        const Comp = (props: Record<string, any>) => {
            const regex = /https:\/\/open.spotify.com\/track\/[a-zA-Z0-9]+/g;
            const matches = regex.exec(props.message.content);
            const styles = findByPropsLazy("anchorUnderlineOnHover");
            const link = matches?.[0];
            const [value] = useAwaiter(async () => {
                if (!link) {
                    return;
                }
                let theinfo = await youtuberify(link);
                if (theinfo && settings.store.useInvidious) {
                    theinfo = replaceYouTubeURL(theinfo, settings.store.invidiousLink);
                }
                return theinfo;
            }, {
                fallbackValue: null,
                deps: [link],
            });
            return <a
                className={classes(styles.anchor, "hi", styles.anchorUnderlineOnHover)}
                href={value!} target="_blank"
                title={value!}
                role="button"><span>{value}</span></a>;
        };

        addAccessory("dick", props => <Comp {...props} />);
    },
});
