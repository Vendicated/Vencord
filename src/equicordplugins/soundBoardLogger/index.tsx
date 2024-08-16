/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addChatBarButton, removeChatBarButton } from "@api/ChatButtons";
import { disableStyle, enableStyle } from "@api/Styles";
import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findExportedComponentLazy } from "@webpack";
import { FluxDispatcher } from "@webpack/common";

import { ChatBarIcon } from "./components/Icons";
import settings from "./settings";
import { updateLoggedSounds } from "./store";
import styles from "./styles.css?managed";
import { getListeners } from "./utils";

const HeaderBarIcon = findExportedComponentLazy("Icon", "Divider");

export default definePlugin({
    name: "SoundBoardLogger",
    authors: [Devs.Moxxie, EquicordDevs.Fres, Devs.echo, EquicordDevs.thororen],
    dependencies: ["ChatInputButtonAPI"],
    settings,
    description: "Logs all soundboards that are played in a voice chat and allows you to download them",
    start() {
        enableStyle(styles);
        FluxDispatcher.subscribe("VOICE_CHANNEL_EFFECT_SEND", async sound => {
            if (!sound?.soundId) return;
            await updateLoggedSounds(sound);
            getListeners().forEach(cb => cb());
        });
        addChatBarButton("vc-soundlog-button", ChatBarIcon);
    },
    stop() {
        disableStyle(styles);
        removeChatBarButton("vc-soundlog-button");
    }
});
