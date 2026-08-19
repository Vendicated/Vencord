/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { definePluginSettings } from "@api/Settings";
import { Flex } from "@components/Flex";
import { Devs } from "@utils/constants";
import definePlugin, { makeRange, OptionType } from "@utils/types";
import { findCssClassesLazy } from "@webpack";
import { Clickable, Popout, Tooltip, useRef, useState } from "@webpack/common";

const settings = definePluginSettings({
    volume: {
        type: OptionType.SLIDER,
        description: "The volume % to set for spotify embeds. Anything above 10% is veeeery loud",
        markers: makeRange(0, 100, 10),
        stickToMarkers: false,
        default: 10
    }
});

const HoverClasses = findCssClassesLazy("hoverButton", "hoverButtonGroup");

function Svg(path: string, label: string) {
    return () => (
        <svg
            height="20"
            width="20"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-label={label}
            focusable={false}
        >
            <path d={path} />
        </svg>
    );
}

// KraXen's icons :yesyes:
// from https://fonts.google.com/icons?icon.style=Rounded&icon.set=Material+Icons
// older material icon style, but still really good
const PlayButton = Svg("M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18c.62-.39.62-1.29 0-1.69L9.54 5.98C8.87 5.55 8 6.03 8 6.82z", "play");
const PauseButton = Svg("M8 19c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2s-2 .9-2 2v10c0 1.1.9 2 2 2zm6-12v10c0 1.1.9 2 2 2s2-.9 2-2V7c0-1.1-.9-2-2-2s-2 .9-2 2z", "pause");
const SkipPrev = Svg("M7 6c.55 0 1 .45 1 1v10c0 .55-.45 1-1 1s-1-.45-1-1V7c0-.55.45-1 1-1zm3.66 6.82l5.77 4.07c.66.47 1.58-.01 1.58-.82V7.93c0-.81-.91-1.28-1.58-.82l-5.77 4.07c-.57.4-.57 1.24 0 1.64z", "previous");
const SkipNext = Svg("M7.58 16.89l5.77-4.07c.56-.4.56-1.24 0-1.63L7.58 7.11C6.91 6.65 6 7.12 6 7.93v8.14c0 .81.91 1.28 1.58.82zM16 7v10c0 .55.45 1 1 1s1-.45 1-1V7c0-.55-.45-1-1-1s-1 .45-1 1z", "next");
const Repeat = Svg("M7 7h10v1.79c0 .45.54.67.85.35l2.79-2.79c.2-.2.2-.51 0-.71l-2.79-2.79c-.31-.31-.85-.09-.85.36V5H6c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1s1-.45 1-1V7zm10 10H7v-1.79c0-.45-.54-.67-.85-.35l-2.79 2.79c-.2.2-.2.51 0 .71l2.79 2.79c.31.31.85.09.85-.36V19h11c.55 0 1-.45 1-1v-4c0-.55-.45-1-1-1s-1 .45-1 1v3z", "repeat");
const Shuffle = Svg("M10.59 9.17L6.12 4.7c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41l4.46 4.46 1.42-1.4zm4.76-4.32l1.19 1.19L4.7 17.88c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0L17.96 7.46l1.19 1.19c.31.31.85.09.85-.36V4.5c0-.28-.22-.5-.5-.5h-3.79c-.45 0-.67.54-.36.85zm-.52 8.56l-1.41 1.41 3.13 3.13-1.2 1.2c-.31.31-.09.85.36.85h3.79c.28 0 .5-.22.5-.5v-3.79c0-.45-.54-.67-.85-.35l-1.19 1.19-3.13-3.14z", "shuffle");

function VolumeIcon() {
    return (
        <svg
            height="20"
            width="20"
            viewBox="0 0 24 24"
            fill="currentColor"
        >
            <path fill="currentColor" d="M12 3a1 1 0 0 0-1-1h-.06a1 1 0 0 0-.74.32L5.92 7H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2.92l4.28 4.68a1 1 0 0 0 .74.32H11a1 1 0 0 0 1-1V3ZM15.1 20.75c-.58.14-1.1-.33-1.1-.92v-.03c0-.5.37-.92.85-1.05a7 7 0 0 0 0-13.5A1.11 1.11 0 0 1 14 4.2v-.03c0-.6.52-1.06 1.1-.92a9 9 0 0 1 0 17.5Z" className=""></path>
            <path fill="currentColor" d="M15.16 16.51c-.57.28-1.16-.2-1.16-.83v-.14c0-.43.28-.8.63-1.02a3 3 0 0 0 0-5.04c-.35-.23-.63-.6-.63-1.02v-.14c0-.63.59-1.1 1.16-.83a5 5 0 0 1 0 9.02Z" className=""></path>
        </svg>
    );
}

function HoverButton({ children, onClick, label }: { label: string; children: React.ReactNode, onClick?: () => void; }) {
    return (
        <Tooltip text={label}>
            {props => (
                <Clickable {...props} className={HoverClasses.hoverButton} onClick={onClick}>
                    {children}
                </Clickable>
            )}
        </Tooltip>
    );
}

// The entire code of this plugin can be found in ipcPlugins
export default definePlugin({
    name: "FixSpotifyEmbeds",
    description: "Fixes spotify embeds being incredibly loud by letting you customise the volume",
    authors: [Devs.Ven],
    tags: ["Media", "Customisation"],
    settings,

    patches: [
        {
            find: 'sandbox:"',
            replacement: {
                match: /"iframe",{(?=.{0,50}?src:\i\.\i\.EMBED\((\i)\))/,
                replace: "$self.Wrapper,{path:$1,",
            }
        }
    ],

    Wrapper(props) {
        const ref = useRef<HTMLDivElement>(null);
        const [shouldShow, setShouldShow] = useState(false);

        return (
            <div style={{ position: "relative", ...props.style }} onMouseLeave={() => setShouldShow(false)}>
                <iframe {...props} />
                <Popout
                    shouldShow={shouldShow}
                    position="top"
                    align="center"
                    targetElementRef={ref}
                    renderPopout={props =>
                        <Flex onMouseLeave={() => setShouldShow(false)} gap={0} className="vc-sp-popout">
                            <HoverButton label="Play on Spotify"><PlayButton /></HoverButton>
                            <HoverButton label="Queue on Spotify"><Shuffle /></HoverButton>
                            <HoverButton label="Volume"><VolumeIcon /></HoverButton>
                        </Flex>
                    }
                >
                    {props => (
                        <div ref={ref} className="vc-sp-pill" onMouseEnter={() => setShouldShow(true)} />
                    )}
                </Popout>
            </div>
        );
    }
});
