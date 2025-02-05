/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { React } from "@webpack/common";
import { definePluginSettings } from "@api/Settings";

const settings = definePluginSettings({
    enableHoverReveal: {
        type: OptionType.BOOLEAN,
        description: "Enable spoiler reveal on hover",
        default: true,
    },
});

export default definePlugin({
    name: "SpoilerReveal",
    description: "Reveal spoilers on hover, ctrl+click to hide them again",
    authors: [Devs.rushy],
    settings,

    patches: [
        {
            find: ".removeObscurity,",
            replacement: {
                match: /super\(\.\.\.\i\),/,
                replace: '$&Vencord.Plugins.plugins.SpoilerReveal.createHoverWrapper(this),'
            }
        }
    ],

    createHoverWrapper(component: any) {
        const originalRenderObscuredText = component.renderObscuredText;

        component.renderObscuredText = function () {
            const result = originalRenderObscuredText.call(this);
            if (!settings.store.enableHoverReveal) {
                return result;
            }

            const handleSpoilerClick = (event: React.MouseEvent<HTMLSpanElement, MouseEvent>) => {
                if (event.ctrlKey && this.state.visible && this._wasClickRevealed) {
                    event.preventDefault();
                    event.stopPropagation();
                    this._wasClickRevealed = false;
                    this.setState({ visible: false });
                    return;
                }

                if (!this._wasClickRevealed) {
                    event.preventDefault();
                    event.stopPropagation();
                    this._wasClickRevealed = true;
                    this.setState({ visible: true });
                    return;
                }
            };

            return React.createElement("span", {
                onMouseEnter: () => {
                    if (!this.state.visible) {
                        this.setState({ visible: true });
                    }
                },
                onMouseLeave: () => {
                    if (this.state.visible && !this._wasClickRevealed) {
                        this.setState({ visible: false });
                    }
                },
                onClick: handleSpoilerClick.bind(this)
            }, result);
        };
    }
});