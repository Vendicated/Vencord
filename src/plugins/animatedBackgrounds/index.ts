/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Devs } from "@utils/constants";
import { OptionType } from "@utils/types";
import definePlugin from "@utils/types";
import './styles.css';

export default definePlugin({
    name: "AnimatedBackgrounds",
    description: "Allows you to use a YouTube video URL as an animated background.",
    authors: [Devs.soul_fire_],
    patches: [],
    options: {
        source: {
            description: "Source URL to replace the background (a background-supporting theme must be installed first)",
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
    }
});
