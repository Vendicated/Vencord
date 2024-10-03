/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors*
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Tooltip } from "@webpack/common";


export default definePlugin({
    name: "VideoLooper",
    description: "Adds a button to enable/disable looping of videos (next to the Download button)",
    authors: [Devs.Terevenen2],
    patches: [
        {
            find: ".removeMosaicItemHoverButton),",
            replacement: {
                match: /\.nonMediaMosaicItem\]:!(\i).{0,50}?children:\[\S,(\S)/,
                replace: "$&,$1&&$2&&$self.renderLoopButton(),"
            },
        },
    ],

    renderLoopButton: ErrorBoundary.wrap(() => {
        return (
            <Tooltip text="Toggle Video Loop">
                {tooltipProps => (
                    <div
                        {...tooltipProps}
                        className="vc-loop-button"
                        role="button"
                        style={{
                            cursor: "pointer",
                            paddingTop: "4px",
                            paddingLeft: "4px",
                            paddingRight: "4px",
                        }}
                        onClick={e => {
                            const video = e.currentTarget.parentNode!.parentNode!.querySelector("video")!;
                            const isLooping = !video.loop;

                            // Update video loop state
                            video.loop = isLooping;
							//re-render colors
                            const paths = e.currentTarget.querySelectorAll("path");
                            paths.forEach(path => {
                                path.setAttribute("fill", isLooping ? "green" : "lightgrey");
                            });
                        }}
                    >
                        <svg width="24px" height="24px" viewBox="0 0 24 24">
                            <path 
                                fill="lightgrey" // Default color
                                d="m11.4978 22c-.26527.0003-.51971-.10515-.707-.293l-2.5-2.5c-.39048-.39029-.39064-1.02322-.00036-1.4137.00012-.00012.00024-.00024.00036-.00036l2.5-2.5c.39214-.38882 1.02523-.38613 1.41405.00601.38649.38979.38648 1.01827-.00002 1.40805l-1.793 1.793 1.793 1.793c.39047.39058.39037 1.02375-.00021 1.41421-.18749.18743-.44172.29274-.70682.29279z"/>
                            <path 
                                fill="lightgrey" // Default color
                                d="m21 4.5h-2c-.55228 0-1 .44772-1 1s.44772 1 1 1h1v11h-8.58813l-1 1 1 1h9.58813c.55214.00014.99986-.44734 1-.99948 0-.00017 0-.00035 0-.00052v-13c.00014-.55214-.44734-.99986-.99948-1-.00017 0-.00035 0-.00052 0z"/>
                            <path 
                                fill="lightgrey" // Default color
                                d="m12.5 2c.26527-.0003.51971.10515.707.293l2.5 2.5c.39048.39027.39065 1.02319.00038 1.41368-.00012.00012-.00025.00025-.00038.00038l-2.5 2.5c-.39296.38799-1.02604.38396-1.41403-.009-.38451-.38944-.3845-1.01564.00003-1.40506l1.793-1.793-1.793-1.793c-.39047-.39058-.39037-1.02375.00021-1.41421.18748-.18742.4417-.29273.70679-.29279z"/>
                            <path 
                                fill="lightgrey" // Default color
                                d="m5 17.5h-1v-11h8.58594l1-1-1-1h-9.58594c-.55214-.00014-.99986.44734-1 .99948v.00052 13c-.00014.55214.44734.99986.99948 1h.00052 2c.55228 0 1-.44772 1-1s-.44772-1-1-1z"/>
                        </svg>
                    </div>
                )}
            </Tooltip>
        );
    }, { noop: true })
});
