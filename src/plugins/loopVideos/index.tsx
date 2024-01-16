/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Tooltip, useEffect, useRef, useState } from "@webpack/common";


const settings = definePluginSettings({
    loop: {
        description: "Whether to enable looping by default or not",
        type: OptionType.BOOLEAN,
        default: true
    }
});

export default definePlugin({
    name: "LoopVideos",
    description: "Adds a loop button next to the volume slider on embedded videos",
    authors: [Devs.Lumap],
    settings,

    patches: [
        {
            find: ".videoControls:",
            replacement: {
                match: /children:\[this\.renderPlayIcon\(\),.{0,200}\.setDurationRef}\),/,
                replace: "$&$self.renderLoopButton(),"
            },
        },
    ],

    renderLoopButton: ErrorBoundary.wrap(() => {
        const [isEnabled, setIsEnabled] = useState(false);
        const elementRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
            if (elementRef.current) {
                const elt = elementRef.current;
                const video = elt.parentNode!.parentNode!.querySelector("video")!;
                video.loop = settings.store.loop;
                setIsEnabled(settings.store.loop);
            }
        }, []);

        return <div ref={elementRef}>
            <Tooltip text="Toggle Loop">
                {tooltipProps => (
                    <div
                        {...tooltipProps}
                        role="button"
                        style={{
                            cursor: "pointer",
                            paddingTop: "4px",
                            paddingLeft: "4px",
                            paddingRight: "4px",
                        }}
                        onClick={e => {
                            const video = e.currentTarget.parentNode!.parentNode!.parentNode!.querySelector("video")!;
                            video.loop = !video.loop;
                            setIsEnabled(video.loop);
                        }}
                    >
                        <svg width="19" height="19" viewBox="0 0 19 19" fill={isEnabled ? "var(--green-200)" : "var(--primary-300)"}>
                            <path d="M14.3353 5.93745H12.4687C11.8119 5.93745 11.2812 6.46811 11.2812 7.12495C11.2812 7.78179 11.8119 8.31245 12.4687 8.31245H17.2187C17.8755 8.31245 18.4062 7.78179 18.4062 7.12495V2.37495C18.4062 1.71812 17.8755 1.18745 17.2187 1.18745C16.5619 1.18745 16.0312 1.71812 16.0312 2.37495V4.27495L15.3781 3.62183C12.131 0.374756 6.8689 0.374756 3.62183 3.62183C0.374756 6.8689 0.374756 12.131 3.62183 15.3781C6.8689 18.6251 12.131 18.6251 15.3781 15.3781C15.8419 14.9142 15.8419 14.1609 15.3781 13.697C14.9142 13.2332 14.1609 13.2332 13.697 13.697C11.3777 16.0164 7.61851 16.0164 5.29917 13.697C2.97983 11.3777 2.97983 7.61851 5.29917 5.29917C7.61851 2.97983 11.3777 2.97983 13.697 5.29917L14.3353 5.93745Z" />
                        </svg>
                    </div>
                )
                }
            </Tooltip >
        </div >;
    }, { noop: true })
});
