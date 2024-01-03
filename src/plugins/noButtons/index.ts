/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";

const STYLE_ELEMENT_ID = "551041413043978242-removeGiftButton";

const logger = new Logger("NoButtonsPlugin", "#f542d7");

const settings = definePluginSettings({
    hideGiftButton: {
        description: "Hide the gift button in the message bar",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    hideBoostButton: {
        description: "Hide the boost button",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    hideStickerButton: {
        description: "Hide the sticker button in the mesage bar",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    hideGifButton: {
        description: "Hide the gif button",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    }
});


export default definePlugin({
    name: "NoButtons",
    description: "Removes annoying buttons that you don't need",
    authors: [Devs.sin],
    patches: [],
    settings,
    start() {
        logger.info("Plugin is starting");

        const buttonsToHide = [
            { setting: "hideGiftButton", label: "Send a gift" },
            { setting: "hideBoostButton", label: "Boost this server" },
            { setting: "hideStickerButton", label: "Open sticker picker" },
            { setting: "hideGifButton", label: "Open GIF picker" }
        ];
        let css = "";

        for (const { label, setting } of buttonsToHide) {
            const shouldHideButton = settings.store[setting];
            if (shouldHideButton) {
                css = css.concat(`[aria-label="${label}"]{display:none}`);
            }
            logger.debug(`Hide button (Label: "${label}", Setting: "${setting}"): ${shouldHideButton}"`);
        }
        css = css.concat('[id="channel-attach-THREAD"]{display:none}');

        logger.debug(`Final css:\n${css}`);

        const style = document.createElement("style");
        style.innerHTML = css;
        style.id = STYLE_ELEMENT_ID;
        document.body.appendChild(style);
    },
    stop() {
        logger.info("Plugin is stopping");

        const styleElement = document.querySelector(`[id="${STYLE_ELEMENT_ID}"]`);
        if (styleElement) {
            styleElement.remove();
        } else {
            logger.error("Cannot remove style element: Style element is null");
            throw new Error("Style element is null");
        }
    },
});
