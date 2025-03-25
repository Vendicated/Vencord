/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addChatBarButton, removeChatBarButton } from "@api/ChatButtons";
import { disableStyle, enableStyle } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { FluxDispatcher } from "@webpack/common";

import { ChatBarIcon } from "./components/Icons";
import { OpenSBLogsButton } from "./components/SoundBoardLog";
import settings from "./settings";
import { updateLoggedSounds } from "./store";
import styles from "./styles.css?managed";
import { getListeners } from "./utils";

export default definePlugin({
    name: "SoundBoardLogger",
    authors: [Devs.Moxxie, EquicordDevs.Fres, Devs.echo, EquicordDevs.thororen],
    description: "Logs all soundboards that are played in a voice chat and allows you to download them",
    dependencies: ["ChatInputButtonAPI"],
    patches: [
        {
            predicate: () => settings.store.IconLocation === "toolbar",
            find: "toolbar:function",
            replacement: {
                match: /(function \i\(\i\){)(.{1,500}toolbar.{1,500}mobileToolbar)/,
                replace: "$1$self.addSBIconToToolBar(arguments[0]);$2"
            }
        }
    ],
    settings,
    addSBIconToToolBar(e: { toolbar: React.ReactNode[] | React.ReactNode; }) {
        if (Array.isArray(e.toolbar))
            return e.toolbar.push(
                <ErrorBoundary noop={true}>
                    <OpenSBLogsButton />
                </ErrorBoundary>
            );

        e.toolbar = [
            <ErrorBoundary noop={true} key={"SoundBoardLogger"} >
                <OpenSBLogsButton />
            </ErrorBoundary>,
            e.toolbar,
        ];
    },
    start() {
        enableStyle(styles);
        FluxDispatcher.subscribe("VOICE_CHANNEL_EFFECT_SEND", async sound => {
            if (!sound?.soundId) return;
            await updateLoggedSounds(sound);
            getListeners().forEach(cb => cb());
        });
        if (settings.store.IconLocation === "chat") addChatBarButton("vc-soundlog-button", ChatBarIcon);
    },
    stop() {
        disableStyle(styles);
        if (settings.store.IconLocation === "chat") removeChatBarButton("vc-soundlog-button");
    }
});
