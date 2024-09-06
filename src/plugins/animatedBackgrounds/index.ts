/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import { OptionType} from "@utils/types";
import definePlugin from "@utils/types";
import './styles.css';
import { Link } from "@components/Link";
import {Forms, ReactDOM, React, useEffect, useState} from "@webpack/common";

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
        },
    },

    start() {
        const appMount = document.getElementById('app-mount');
        if (appMount) {
            const newDiv = document.createElement('div');
            const source = Vencord.Settings.plugins.AnimatedBackgrounds.source;
            appMount.appendChild(newDiv);
            ReactDOM.render(<AnimatedBackgrounds />, newDiv);
            if (source.endsWith('.webp')) {
                appMount.style.setProperty('background-image', `url(${source})`, 'important');
            }
        }
    },

    settingsAboutComponent: () => {
        return (
            <>
                <Forms.FormText>
                    A background-supporting theme must be installed first. For example, <Link href="https://raw.githubusercontent.com/soulfireneedusername/Background-removing-theme/main/background-removing-theme">this theme</Link>, or visit <Link href="https://betterdiscord.app/themes">BDThemes</Link>. You can use either a .webp image link or a YouTube video url.
                </Forms.FormText>
                <Forms.FormText>
                <Forms.FormText>
                    <br /> Use any video, for example a downloaded Video from YT and convert it into a .webp file. It should look something like this: https://example.com/image.webp, or just any YouTube URL. Here is a good YouTube video example: <Link href="https://youtu.be/Q7W4JISNmQk?si=kwLxgAAh9cQAQtYc">10h loop</Link>.
                </Forms.FormText>
                </Forms.FormText>
            </>
        );
    }
});

const AnimatedBackgrounds = () => {
    const [source] = useState(Vencord.Settings.plugins.AnimatedBackgrounds.source);
    const [, setVideoId] = useState('');
    const [iframeSrc, setIframeSrc] = useState('');

    useEffect(() => {
        if (source.endsWith('.webp')) {
            document.body.style.backgroundImage = `url(${source})`;
        } else if (source.includes('https://youtu.be/')) {
            try {
                const url = new URL(source);
                let videoId;
                if (url.hostname === 'youtu.be') {
                    videoId = url.pathname.slice(1);
                } else {
                    videoId = url.searchParams.get('v');
                }
                setVideoId(videoId);
                setIframeSrc(`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&showinfo=0&autohide=1&loop=1&playlist=${videoId}&vq=highres`);
            } catch (error) {
                console.error(error);
            }
        }
    }, [source]);

    return (
        <div className='container'>
            <iframe className='iframe' src={iframeSrc} allow="autoplay; fullscreen; encrypted-media" />
        </div>
    );
};
