/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Styles } from "@api/index";
import { Devs } from "@utils/constants";
import definePlugin, { StartAt } from "@utils/types";
import { beforeInitListeners } from "@webpack";
import { WebpackInstance } from "discord-types/other";

export default definePlugin({
    name: "StyleListenerAPI",
    description: "API to listen into the contents of css added by webpack",
    authors: [Devs.F53, Devs.Nuckyz],
    startAt: StartAt.Init,

    start: async () => {
        window.requestAnimationFrame(async () => {
            const initialStyleLink: HTMLLinkElement | null = document.head.querySelector("link[rel=stylesheet]");
            if (!initialStyleLink) return console.error("StyleListenerAPI failed to get initial stylesheet");

            const styles = await fetch(initialStyleLink.href).then(r => r.text());
            for (const listener of Styles.styleListeners)
                listener(styles, true);
        });

        const wreq = await new Promise<WebpackInstance>(r => beforeInitListeners.add(r));

        const chunksLoading = new Set<string>();
        const handleChunkCss = wreq.f.css;

        wreq.f.css = function (this: unknown) {
            const result = Reflect.apply(handleChunkCss, this, arguments);

            if (chunksLoading.has(arguments[0]))
                return result;
            chunksLoading.add(arguments[0]);

            if (!(Array.isArray(arguments[1]) && arguments[1].length > 0))
                return result;

            Promise.all(arguments[1]).then(async () => {
                await Promise.all(arguments[1]);
                chunksLoading.delete(arguments[0]);

                const cssFilepath = wreq.p + wreq.k(arguments[0]);
                const styles = await fetch(cssFilepath)
                    .then(r => r.text()).catch(() => { });
                if (!styles) return;
                for (const listener of Styles.styleListeners)
                    listener(styles, false);
            });

            return result;
        };
    },
});
