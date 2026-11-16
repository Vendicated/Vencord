/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 cegged
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useIsPlaying } from "@plugins/soundPanel.desktop/audio/player";
import { classes } from "@utils/misc";
import type { Channel } from "@vencord/discord-types";
import { findCssClassesLazy } from "@webpack";
import { Popout, Tooltip, useRef, useState } from "@webpack/common";

import { cl } from "./common";
import { SoundPanelIcon } from "./icons";
import SoundPanelPopout from "./SoundPanelPopout";

const PanelButtonClasses = findCssClassesLazy("button", "buttonColor", "buttonContents", "buttonIcon", "greyButtonActive", "voiceButtonsContainer");

export function PanelButton({ channel }: { channel: Channel; }) {
    const [show, setShow] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const isPlaying = useIsPlaying();

    return (
        <Popout
            position="top"
            align="center"
            spacing={12}
            animation={Popout.Animation.FADE}
            shouldShow={show}
            onRequestClose={() => setShow(false)}
            targetElementRef={buttonRef}
            renderPopout={() => <SoundPanelPopout channel={channel} />}
        >
            {(_, { isShown }) => (
                <Tooltip text="Sound Panel" shouldShow={!isShown}>
                    {tooltipProps => (
                        <button
                            {...tooltipProps}
                            ref={buttonRef}
                            type="button"
                            aria-label="Sound Panel"
                            aria-expanded={isShown}
                            className={classes(
                                PanelButtonClasses.button,
                                PanelButtonClasses.buttonColor,
                                cl("panel-button"),
                                isShown && PanelButtonClasses.greyButtonActive,
                                isPlaying && cl("panel-button-playing")
                            )}
                            onClick={() => setShow(v => !v)}
                        >
                            <div className={classes(PanelButtonClasses.buttonContents, cl("panel-button-contents"))}>
                                <SoundPanelIcon className={PanelButtonClasses.buttonIcon} />
                            </div>
                        </button>
                    )}
                </Tooltip>
            )}
        </Popout>
    );
}
