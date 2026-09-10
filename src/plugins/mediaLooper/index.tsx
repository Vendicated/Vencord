/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Tooltip, useEffect, useState } from "@webpack/common";
import { RefObject } from "react";

import LoopIcon from "./components/LoopIcon";

const cl = classNameFactory("vc-media-loop-");

type MediaRef = RefObject<HTMLMediaElement> | undefined;

export default definePlugin({
    name: "mediaLooper",
    description: "Allows enabling/disabling looping of video, audio and voice message embeds",
    authors: [Devs.Terevenen2],

    PlaybackLoopComponent({ mediaRef }: { mediaRef: MediaRef }) {
        const [isLooping, setIsLooping] = useState(false);

        const toggleLoop = () => {
            const media = mediaRef?.current;
            if (media) {
                const newLoopState = !media.loop;
                media.loop = newLoopState;
                setIsLooping(newLoopState);
            }
        };

        useEffect(() => {
            const media = mediaRef?.current;
            if (media) {
                media.loop = false; // Ensure loop is disabled initially
                setIsLooping(media.loop); // Set initial loop state
            }
        }, [mediaRef]);

        return (
            <button
                className={cl("icon vc-media-loop-icon")} // Make sure the CSS class is applied
                onClick={toggleLoop}
                style={{ color: isLooping ? 'white' : 'var(--interactive-normal)' }} // Inline style to override CSS if necessary
            >
                <LoopIcon />
            </button>
        );
    },

    renderComponent(mediaRef: MediaRef) {
        return (
            <ErrorBoundary noop>
                <this.PlaybackLoopComponent mediaRef={mediaRef} />
            </ErrorBoundary>
        );
    },

    patches: [
        // voice message embeds
        {
            find: "\"--:--\"",
            replacement: {
                match: /onVolumeShow:\i,onVolumeHide:\i\}\)(?<=useCallback\(\(\)=>\{let \i=(\i).current;.+?)/,
                replace: "$&,$self.renderComponent($1)"
            }
        },
        // audio & video embeds
        {
            find: "renderControls(){",
            replacement: {
                match: /onToggleMuted:this.toggleMuted,/,
                replace: "$&mediaRef:this.mediaRef,"
            }
        },
        {
            find: "AUDIO:\"AUDIO\"",
            replacement: {
                match: /onVolumeHide:\i,iconClassName:\i.controlIcon,iconColor:"currentColor",sliderWrapperClassName:\i.volumeSliderWrapper\}\)\}\),/,
                replace: "$&$self.renderComponent(this.props.mediaRef),"
            }
        }
    ]
});
