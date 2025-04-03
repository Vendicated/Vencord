/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Tooltip, useRef, useState } from "@webpack/common";

const settings = definePluginSettings(
    {
        preservePitch: {
            type: OptionType.BOOLEAN,
            description: "Should pitch be preserved when changing speed?",
            default: false,
            restartNeeded: true
        },
    });

export default definePlugin({
    name: "VideoSpeed",
    description: "Allows you to change the speed of videos",
    authors: [Devs.Samwich],
    settings,
    patches: [
        {
            find: /\.VIDEO\?\i\.videoControls:/,
            replacement: {
                match: /children:\[this\.renderPlayIcon\(\),.{0,200}\.setDurationRef}\),/,
                replace: "$&$self.SpeedButton(),"
            },
        },
    ],
    SpeedButton: ErrorBoundary.wrap(() => {
        const elementRef = useRef<HTMLDivElement>(null);

        const [speed, setSpeed] = useState(1);

        const speedPaths =
        {
            1.5: "M320 48a48 48 0 1 1 96 0a48 48 0 1 1-96 0m-115.5 73.3c-5.4-2.5-11.7-1.9-16.4 1.7l-40.9 30.7c-14.1 10.6-34.2 7.7-44.8-6.4s-7.7-34.2 6.4-44.8l40.9-30.7c23.7-17.8 55.3-21 82.1-8.4l90.4 42.5c29.1 13.7 36.8 51.6 15.2 75.5L299.1 224h97.4c30.3 0 53 27.7 47.1 57.4l-28.2 140.9c-3.5 17.3-20.3 28.6-37.7 25.1s-28.6-20.3-25.1-37.7L377 288h-70.3c8.6 19.6 13.3 41.2 13.3 64c0 88.4-71.6 160-160 160S0 440.4 0 352s71.6-160 160-160c11.1 0 22 1.1 32.4 3.3l54.2-54.2zM160 448a96 96 0 1 0 0-192a96 96 0 1 0 0 192",
            1.25: "M320 48a48 48 0 1 0-96 0a48 48 0 1 0 96 0M125.7 175.5c9.9-9.9 23.4-15.5 37.5-15.5c1.9 0 3.8.1 5.6.3L137.6 254c-9.3 28 1.7 58.8 26.8 74.5l86.2 53.9l-25.4 88.8c-4.9 17 5 34.7 22 39.6s34.7-5 39.6-22l28.7-100.4c5.9-20.6-2.6-42.6-20.7-53.9L238 299l30.9-82.4l5.1 12.3c15 35.8 49.9 59.1 88.7 59.1H384c17.7 0 32-14.3 32-32s-14.3-32-32-32h-21.3c-12.9 0-24.6-7.8-29.5-19.7l-6.3-15c-14.6-35.1-44.1-61.9-80.5-73.1l-48.7-15C186.6 97.8 175 96 163.3 96c-31 0-60.8 12.3-82.7 34.3l-23.2 23.1c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l23.1-23.1zM91.2 352H32c-17.7 0-32 14.3-32 32s14.3 32 32 32h69.6c19 0 36.2-11.2 43.9-28.5l11.5-25.9l-9.5-6a95.394 95.394 0 0 1-37.9-44.9z",
            1: "M112 48a48 48 0 1 1 96 0a48 48 0 1 1-96 0m40 304v128c0 17.7-14.3 32-32 32s-32-14.3-32-32V256.9l-28.6 47.6c-9.1 15.1-28.8 20-43.9 10.9s-20-28.8-10.9-43.9l58.3-97c17.4-28.9 48.6-46.6 82.3-46.6h29.7c33.7 0 64.9 17.7 82.3 46.6l58.3 97c9.1 15.1 4.2 34.8-10.9 43.9s-34.8 4.2-43.9-10.9L232 256.9V480c0 17.7-14.3 32-32 32s-32-14.3-32-32V352z",
            0.5: "M368 32c41.7 0 75.9 31.8 79.7 72.5l85.6 26.3c25.4 7.8 42.8 31.3 42.8 57.9c0 21.8-11.7 41.9-30.7 52.7l-144.6 82.1l92.5 92.5H544c17.7 0 32 14.3 32 32s-14.3 32-32 32h-64c-8.5 0-16.6-3.4-22.6-9.4L346.9 360.2c11.7-36 3.2-77.1-25.4-105.7c-40.6-40.6-106.3-40.6-146.9-.1l-73.6 70c-6.4 6.1-6.7 16.2-.6 22.6s16.2 6.6 22.6.6l73.8-70.2l.1-.1l.1-.1c3.5-3.5 7.3-6.6 11.3-9.2c27.9-18.5 65.9-15.4 90.5 9.2c24.7 24.7 27.7 62.9 9 90.9c-2.6 3.8-5.6 7.5-9 10.9l-37 37H352c17.7 0 32 14.3 32 32s-14.3 32-32 32H64c-35.3 0-64-28.7-64-64C0 249.6 127 112.9 289.3 97.5C296.2 60.2 328.8 32 368 32m0 104a24 24 0 1 0 0-48a24 24 0 1 0 0 48"
        };

        return <div ref={elementRef}>
            <Tooltip text={`Toggle Speed (${speed})`}>
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
                            console.log(e);
                            let newSpeed;
                            switch (speed) {
                                case 1:
                                    newSpeed = 1.25;
                                    break;
                                case 1.25:
                                    newSpeed = 1.5;
                                    break;
                                case 1.5:
                                    newSpeed = 0.5;
                                    break;
                                case 0.5:
                                    newSpeed = 1;
                                    break;
                            }
                            const parent = e.currentTarget.parentNode!.parentNode!.parentNode!;

                            // this works with audio too as it is but it doesnt always select the right audio tag
                            const media = parent.querySelector("video")! /* ?? document.querySelector("source")?.parentElement*/;
                            console.log(media);
                            media.playbackRate = newSpeed;
                            media.preservesPitch = settings.store.preservePitch;
                            setSpeed(newSpeed);
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="19px" height="19px" viewBox="0 0 448 512"><path fill="currentColor" d={speedPaths[speed]}></path></svg>
                    </div>
                )
                }
            </Tooltip >
        </div >;
    }, { noop: true })
});
