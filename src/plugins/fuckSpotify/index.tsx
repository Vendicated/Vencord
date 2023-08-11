/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./fuckspotify.css";

import { addAccessory } from "@api/MessageAccessories";
import { Devs } from "@utils/constants.js";
import { classes } from "@utils/misc";
import { useAwaiter } from "@utils/react";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";

async function youtuberify(link: string): Promise<string | undefined> {
    if (link.includes("playlist")) {
        return;
    }
    return await fetch(`https://youtuber.exhq.workers.dev/${link}`).then(it => it.text());
}

export default definePlugin({
    name: "fuck spotify",
    description: "i dont like spotify",
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
                const theinfo = await youtuberify(link);
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
