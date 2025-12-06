/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { disableStyle, enableStyle } from "@api/Styles";
import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { FluxDispatcher } from "@webpack/common";

import { LogIcon } from "./components/Icons";
import { OpenSBLogsButton } from "./components/SoundBoardLog";
import settings from "./settings";
import { updateLoggedSounds } from "./store";
import styles from "./styles.css?managed";
import { getListeners } from "./utils";

export default definePlugin({
    name: "SoundBoardLogger",
    authors: [Devs.Moxxie, EquicordDevs.Fres, Devs.amy, Devs.thororen],
    description: "Logs all soundboards that are played in a voice chat and allows you to download them",
    dependencies: ["AudioPlayerAPI"],
    settings,

    headerBarButton: {
        icon: LogIcon,
        render: OpenSBLogsButton
    },
    start() {
        enableStyle(styles);
        FluxDispatcher.subscribe("VOICE_CHANNEL_EFFECT_SEND", async sound => {
            if (!sound?.soundId) return;
            await updateLoggedSounds(sound);
            getListeners().forEach(cb => cb());
        });
    },
    stop() {
        disableStyle(styles);
    }
});
