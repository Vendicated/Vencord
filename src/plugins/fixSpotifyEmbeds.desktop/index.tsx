/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { definePluginSettings } from "@api/Settings";
import { Flex } from "@components/Flex";
// :trolley:
import { SpotifyStore } from "@plugins/spotifyControls/SpotifyStore";
import { Devs } from "@utils/constants";
import definePlugin, { makeRange, OptionType, PluginNative } from "@utils/types";
import { findCssClassesLazy } from "@webpack";
import { Clickable, Popout, showToast, Slider, Toasts, Tooltip, useRef, useState } from "@webpack/common";

const settings = definePluginSettings({
    volume: {
        type: OptionType.SLIDER,
        description: "The volume % to set for spotify embeds. Anything above 10% is veeeery loud",
        markers: makeRange(0, 100, 10),
        stickToMarkers: false,
        default: 10
    }
});

const Native = VencordNative.pluginHelpers.FixSpotifyEmbeds as PluginNative<typeof import("./native")>;

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

    Wrapper({ path, ...props }) {
        const ref = useRef<HTMLDivElement>(null);
        const [shouldShow, setShouldShow] = useState(false);
        const [volume, setVolume] = useState(settings.store.volume);

        const [, type, id] = path.match(/\/(track|album|playlist)\/(\w+)/)!;
        const uri = `spotify:${type}:${id}`;

        return (
            <div style={{ position: "relative", ...props.style }} onMouseLeave={() => setShouldShow(false)}>
                <iframe {...props} />
                <Popout
                    shouldShow={shouldShow}
                    position="top"
                    align="center"
                    targetElementRef={ref}
                    renderPopout={popoutProps =>
                        <Flex onMouseLeave={() => setShouldShow(false)} gap={0} className="vc-sp-popout">
                            <HoverButton
                                label="Play on Spotify"
                                onClick={() => SpotifyStore._req("put", "/play", { body: type === "track" ? { uris: [uri] } : { context_uri: uri } })}
                            >
                                <PlayButton />
                            </HoverButton>
                            <HoverButton
                                label="Queue on Spotify"
                                onClick={async () => {
                                    await SpotifyStore._req("post", "/queue?uri=" + encodeURIComponent(uri));
                                    showToast("Added to queue", Toasts.Type.SUCCESS);
                                }}
                            >
                                <Shuffle />
                            </HoverButton>
                            <div className="vc-sp-slider">
                                <Slider
                                    initialValue={volume}
                                    onValueChange={v => {
                                        setVolume(v);
                                        Native.setVolumeForEmbeds(path, v);
                                    }}
                                    asValueChanges={v => {
                                        Native.setVolumeForEmbeds(path, v);
                                    }}
                                    minValue={0}
                                    maxValue={100}
                                    grabberClassName="vc-sp-grabber"
                                />
                            </div>
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
