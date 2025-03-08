/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { makeRange } from "@components/PluginSettings/components";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ContextMenuApi, FluxDispatcher, Heading, Menu, React, Tooltip, useEffect } from "@webpack/common";
import { RefObject } from "react";

import SpeedIcon from "./components/SpeedIcon";

const cl = classNameFactory("vc-media-playback-speed-");

const min = 0.25;
const max = 3.5;
const speeds = makeRange(min, max, 0.25);

const settings = definePluginSettings({
    test: {
        type: OptionType.COMPONENT,
        description: "",
        component() {
            return <Heading variant="heading-lg/bold" selectable={false}>
                Default playback speeds
            </Heading>;
        }
    },
    defaultVoiceMessageSpeed: {
        type: OptionType.SLIDER,
        default: 1,
        description: "Voice messages",
        markers: speeds,
    },
    defaultVideoSpeed: {
        type: OptionType.SLIDER,
        default: 1,
        description: "Videos",
        markers: speeds,
    },
    defaultAudioSpeed: {
        type: OptionType.SLIDER,
        default: 1,
        description: "Audios",
        markers: speeds,
    },
});

type MediaRef = RefObject<HTMLMediaElement> | undefined;

export default definePlugin({
    name: "MediaPlaybackSpeed",
    description: "Allows changing the (default) playback speed of media embeds",
    authors: [Devs.D3SOX],

    settings,

    PlaybackSpeedComponent({ mediaRef }: { mediaRef: MediaRef }) {
        const changeSpeed = (speed: number) => {
            const media = mediaRef?.current;
            if (media) {
                media.playbackRate = speed;
            }
        };

        useEffect(() => {
            if (!mediaRef?.current) return;
            const media = mediaRef.current;
            if (media.tagName === "AUDIO") {
                const isVoiceMessage = media.className.includes("audioElement_");
                changeSpeed(isVoiceMessage ? settings.store.defaultVoiceMessageSpeed : settings.store.defaultAudioSpeed);
            } else if (media.tagName === "VIDEO") {
                changeSpeed(settings.store.defaultVideoSpeed);
            }
        }, [mediaRef]);

        return (
            <Tooltip text="Playback speed">
                {tooltipProps => (
                    <button
                        {...tooltipProps}
                        className={cl("icon")}
                        onClick={e => {
                            ContextMenuApi.openContextMenu(e, () =>
                                <Menu.Menu
                                    navId="vc-playback-speed"
                                    onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
                                    aria-label="Playback speed control"
                                >
                                    <Menu.MenuGroup
                                        label="Playback speed"
                                    >
                                        {speeds.map(speed => (
                                            <Menu.MenuItem
                                                key={speed}
                                                id={"speed-" + speed}
                                                label={`${speed}x`}
                                                action={() => changeSpeed(speed)}
                                            />
                                        ))}
                                    </Menu.MenuGroup>
                                </Menu.Menu>
                            );
                        }}>
                        <SpeedIcon/>
                    </button>
                )}
            </Tooltip>
        );
    },

    renderComponent(mediaRef: MediaRef) {
        return <ErrorBoundary noop>
            <this.PlaybackSpeedComponent mediaRef={mediaRef} />
        </ErrorBoundary>;
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
            // need to pass media ref via props to make it easily accessible from inside controls
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
