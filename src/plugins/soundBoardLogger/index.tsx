/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { disableStyle, enableStyle } from "@api/Styles";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { FluxDispatcher } from "@webpack/common";

import { IconWithTooltip, LogIcon } from "./components/Icons";
import { openSoundBoardLog } from "./components/SoundBoardLog";
import settings from "./settings";
import { updateLoggedSounds } from "./store";
import styles from "./styles.css?managed";
import { getListeners } from "./utils";

export default definePlugin({
    name: "SoundBoardLogger",
    authors: [
        Devs.Fres,
        Devs.echo
    ],
    settings,
    patches: [
        {
            find: "\"invite-button\"",
            replacement: {
                match: /\)\),\(0,(\w{1,3})\.(\w{1,3})\)\((\w{1,3})\.Fragment,{children:(\w{1,3})}\)\}\}/,
                replace: ")),$4.unshift($self.getComp()),(0,$1.$2)($3.Fragment,{children:$4})}}"
            }
        }
    ],
    description: "Logs all soundboards that are played in a voice chat and allows you to download them",
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
    },
    getComp() {
        return <IconWithTooltip text="Open SoundBoard Log" icon={<LogIcon />} onClick={openSoundBoardLog} />;
    }
});
