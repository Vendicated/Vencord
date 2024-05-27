/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import { OptionType } from "@utils/types";
import definePlugin from "@utils/types";
import './styles.css';
import { Link } from "@components/Link";
import {Forms,React,} from "@webpack/common";

export default definePlugin({
    name: "AnimatedBackgrounds",
    description: "Allows you to use a YouTube video URL as an animated background.",
    authors: [Devs.soul_fire_],
    patches: [],

    options: {
        source: {
            description: "Source URL to replace the background",
            type: OptionType.STRING,
            restartNeeded: true,
        }
    },
    start() {
        const appMount = document.querySelector('#app-mount.appMount_c99875');
        if (appMount) {
            const source = Vencord.Settings.plugins.AnimatedBackgrounds.source;
            try {
                const url = new URL(source);
                let videoId;
                if (url.hostname === 'youtu.be') {
                    videoId = url.pathname.slice(1);
                } else {
                    videoId = url.searchParams.get('v');
                }
                const iframeSrc = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&showinfo=0&autohide=1&loop=1&playlist=${videoId}&vq=highres`;
                const iframe = this.createIframe(iframeSrc);
                appMount.style.background = 'none';
                appMount.appendChild(iframe);
            } catch (error) {
            }
        }
    },
    createIframe(src) {
        const container = document.createElement('div');
        container.className = 'container';

        const iframe = document.createElement('iframe');
        iframe.className = 'iframe';
        iframe.src = src;
        iframe.allow = "autoplay; fullscreen; encrypted-media";

        container.appendChild(iframe);
        return container;
    },

    settingsAboutComponent: () => {


        return (
            <>
                <Forms.FormText>
                    A background-supporting theme must be installed first. For example, <Link href="https://raw.githubusercontent.com/CapnKitten/Translucence/master/Translucence.theme.css">this theme</Link>.
                </Forms.FormText>
                <Forms.FormText>
                    Here is a video link example: <Link href="https://youtu.be/Q7W4JISNmQk?si=kwLxgAAh9cQAQtYc">https://youtu.be/Q7W4JISNmQk?si=kwLxgAAh9cQAQtYc</Link>.
                </Forms.FormText>
            </>
        );
    }

});
