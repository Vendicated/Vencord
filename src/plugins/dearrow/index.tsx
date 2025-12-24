/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { Tooltip } from "@webpack/common";
import type { Component } from "react";

interface Props {
    embed: {
        rawTitle: string;
        provider?: {
            name: string;
        };
        thumbnail: {
            proxyURL: string;
        };
        video: {
            url: string;
        };

        dearrow: {
            enabled: boolean;
            oldTitle?: string;
            oldThumb?: string;
        };
    };
}

const enum ReplaceElements {
    ReplaceAllElements,
    ReplaceTitlesOnly,
    ReplaceThumbnailsOnly
}

const embedUrlRe = /https:\/\/www\.youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/;

async function embedDidMount(this: Component<Props>) {
    try {
        const { embed } = this.props;
        const { replaceElements, dearrowByDefault } = settings.store;

        if (!embed || embed.dearrow || embed.provider?.name !== "YouTube" || !embed.video?.url) return;

        const videoId = embedUrlRe.exec(embed.video.url)?.[1];
        if (!videoId) return;

        const res = await fetch(`https://sponsor.ajay.app/api/branding?videoID=${videoId}`);
        if (!res.ok) return;

        const { titles, thumbnails } = await res.json();

        const hasTitle = titles[0]?.votes >= 0;
        const hasThumb = thumbnails[0]?.votes >= 0 && !thumbnails[0].original;

        if (!hasTitle && !hasThumb) return;


        embed.dearrow = {
            enabled: dearrowByDefault
        };

        if (hasTitle && replaceElements !== ReplaceElements.ReplaceThumbnailsOnly) {
            const replacementTitle = titles[0].title.replace(/(^|\s)>(\S)/g, "$1$2");

            embed.dearrow.oldTitle = dearrowByDefault ? embed.rawTitle : replacementTitle;
            if (dearrowByDefault) embed.rawTitle = replacementTitle;
        }
        if (hasThumb && replaceElements !== ReplaceElements.ReplaceTitlesOnly) {
            const replacementProxyURL = `https://dearrow-thumb.ajay.app/api/v1/getThumbnail?videoID=${videoId}&time=${thumbnails[0].timestamp}`;

            embed.dearrow.oldThumb = dearrowByDefault ? embed.thumbnail.proxyURL : replacementProxyURL;
            if (dearrowByDefault) embed.thumbnail.proxyURL = replacementProxyURL;
        }

        this.forceUpdate();
    } catch (err) {
        new Logger("Dearrow").error("Failed to dearrow embed", err);
    }
}

function DearrowButton({ component }: { component: Component<Props>; }) {
    const { embed } = component.props;
    if (!embed?.dearrow) return null;

    return (
        <Tooltip text={embed.dearrow.enabled ? "This embed has been dearrowed, click to restore" : "Click to dearrow"}>
            {({ onMouseEnter, onMouseLeave }) => (
                <button
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                    className={"vc-dearrow-toggle-" + (embed.dearrow.enabled ? "on" : "off")}
                    onClick={() => {
                        const { enabled, oldThumb, oldTitle } = embed.dearrow;
                        settings.store.dearrowByDefault = !enabled;
                        embed.dearrow.enabled = !enabled;
                        if (oldTitle) {
                            embed.dearrow.oldTitle = embed.rawTitle;
                            embed.rawTitle = oldTitle;
                        }
                        if (oldThumb) {
                            embed.dearrow.oldThumb = embed.thumbnail.proxyURL;
                            embed.thumbnail.proxyURL = oldThumb;
                        }

                        component.forceUpdate();
                    }}
                >
                    {/* Dearrow Icon, taken from https://dearrow.ajay.app/logo.svg (and optimised) */}
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24px"
                        height="24px"
                        viewBox="0 0 36 36"
                        aria-label="Toggle Dearrow"
                        className="vc-dearrow-icon"
                    >
                        <path
                            fill="#1213BD"
                            d="M36 18.302c0 4.981-2.46 9.198-5.655 12.462s-7.323 5.152-12.199 5.152s-9.764-1.112-12.959-4.376S0 23.283 0 18.302s2.574-9.38 5.769-12.644S13.271 0 18.146 0s9.394 2.178 12.589 5.442C33.931 8.706 36 13.322 36 18.302z"
                        />
                        <path
                            fill="#88c9f9"
                            d="m 30.394282,18.410186 c 0,3.468849 -1.143025,6.865475 -3.416513,9.137917 -2.273489,2.272442 -5.670115,2.92874 -9.137918,2.92874 -3.467803,0 -6.373515,-1.147212 -8.6470033,-3.419654 -2.2734888,-2.272442 -3.5871299,-5.178154 -3.5871299,-8.647003 0,-3.46885 0.9420533,-6.746149 3.2144954,-9.0196379 2.2724418,-2.2734888 5.5507878,-3.9513905 9.0196378,-3.9513905 3.46885,0 6.492841,1.9322561 8.76633,4.204698 2.273489,2.2724424 3.788101,5.2974804 3.788101,8.7663304 z"
                        />
                        <path
                            fill="#0a62a5"
                            d="m 23.95823,17.818306 c 0,3.153748 -2.644888,5.808102 -5.798635,5.808102 -3.153748,0 -5.599825,-2.654354 -5.599825,-5.808102 0,-3.153747 2.446077,-5.721714 5.599825,-5.721714 3.153747,0 5.798635,2.567967 5.798635,5.721714 z"
                        />
                    </svg>

                </button>
            )}
        </Tooltip>
    );
}

const settings = definePluginSettings({
    hideButton: {
        description: "Hides the Dearrow button from YouTube embeds",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: true
    },
    replaceElements: {
        description: "Choose which elements of the embed will be replaced",
        type: OptionType.SELECT,
        restartNeeded: true,
        options: [
            { label: "Everything (Titles & Thumbnails)", value: ReplaceElements.ReplaceAllElements, default: true },
            { label: "Titles", value: ReplaceElements.ReplaceTitlesOnly },
            { label: "Thumbnails", value: ReplaceElements.ReplaceThumbnailsOnly },
        ],
    },
    dearrowByDefault: {
        description: "Dearrow videos automatically",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: false
    }
});

export default definePlugin({
    name: "Dearrow",
    description: "Makes YouTube embed titles and thumbnails less sensationalist, powered by Dearrow",
    authors: [Devs.Ven],
    settings,

    embedDidMount,
    renderButton(component: Component<Props>) {
        return (
            <ErrorBoundary noop>
                <DearrowButton component={component} />
            </ErrorBoundary>
        );
    },

    patches: [{
        find: "this.renderInlineMediaEmbed",
        replacement: [
            // patch componentDidMount to replace embed thumbnail and title
            {
                match: /render\(\)\{.{0,30}let\{embed:/,
                replace: "componentDidMount=$self.embedDidMount;$&"
            },

            // add dearrow button
            {
                match: /children:\[(?=null!=\i\?(\i)\.renderSuppressButton)/,
                replace: "children:[$self.renderButton($1),",
                predicate: () => !settings.store.hideButton
            }
        ]
    }],
});
