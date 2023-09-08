/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { React, Tooltip, useEffect, useRef } from "@webpack/common";


const settings = definePluginSettings({
    loop: {
        description: "Whether to enable looping by default or not",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: false
    }
});

export default definePlugin({
    name: "LoopAnyVideo",
    description: "Adds a loop button next to the volume slider for embedded videos",
    authors: [Devs.Lumap],
    settings,

    patches: [
        {
            find: "().videoControls:",
            replacement: {
                match: /children:\[this\.renderPlayIcon\(\),.{0,200}\.setDurationRef}\),/gm,
                replace: "$&$self.renderLoopButton(),"
            },
        },
    ],

    renderLoopButton: ErrorBoundary.wrap(() => {
        const elementRef = useRef<HTMLDivElement>(null);
        let set = false;
        useEffect(() => {
            if (elementRef.current && !set) {
                const elt = elementRef.current;
                const video = elt.parentNode!.parentNode!.querySelector("video");
                if (video) video.loop = settings.store.loop;
                (document.querySelector(":root") as HTMLElement)!.style.setProperty("--vc-loop-btn", settings.store.loop ? "var(--green-300)" : "var(--interactive-active)");
                set = true;
            }
            return () => {
                set = false;
            };
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
                            (document.querySelector(":root") as HTMLElement)!.style.setProperty("--vc-loop-btn", video.loop ? "var(--green-300)" : "var(--interactive-active)");
                        }}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18.1078 7.49995H15.75C14.9203 7.49995 14.25 8.17026 14.25 8.99995C14.25 9.82964 14.9203 10.5 15.75 10.5H21.75C22.5796 10.5 23.25 9.82964 23.25 8.99995V2.99995C23.25 2.17026 22.5796 1.49995 21.75 1.49995C20.9203 1.49995 20.25 2.17026 20.25 2.99995V5.39995L19.425 4.57495C15.3234 0.473389 8.67651 0.473389 4.57495 4.57495C0.473389 8.67651 0.473389 15.3234 4.57495 19.425C8.67651 23.5265 15.3234 23.5265 19.425 19.425C20.0109 18.839 20.0109 17.8875 19.425 17.3015C18.839 16.7156 17.8875 16.7156 17.3015 17.3015C14.3718 20.2312 9.62339 20.2312 6.6937 17.3015C3.76401 14.3718 3.76401 9.62339 6.6937 6.6937C9.62339 3.76401 14.3718 3.76401 17.3015 6.6937L18.1078 7.49995Z" fill="var(--vc-loop-btn)" />
                        </svg>
                    </div>
                )
                }
            </Tooltip >
        </div >;
    }, { noop: true })
});
