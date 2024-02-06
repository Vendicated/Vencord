/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { disableStyle,enableStyle } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { FluxDispatcher } from "@webpack/common";

import { IconWithTooltip,LogIcon } from "./components/Icons";
import { openSoundBoardLog } from "./components/SoundBoardLog";
import settings from "./settings";
import { updateLoggedSounds } from "./store";
import styles from "./styles.css?managed";
import { getListeners } from "./utils";

export default definePlugin({
    name: "SoundBoardLogger",
    authors: [
        Devs.ImpishMoxxie,
        Devs.fres,
        Devs.echo
    ],
    settings,
    patches: [
        {
            predicate: () => settings.store.IconLocation === "chat",
            find: "ChannelTextAreaButtons",
            replacement: {
                match: /(\i)\.push.{1,30}disabled:(\i),.{1,20}\},"gift"\)\)/,
                replace: "$&,(()=>{try{$2||$1.push($self.chatBarIcon(arguments[0]))}catch{}})()",
            }
        },
        {
            predicate: () => settings.store.IconLocation === "toolbar",
            find: ".iconBadge}):null",
            replacement: {
                match: /className:(\i).toolbar,children:(\i)/,
                replace: "className:$1.toolbar,children:$self.toolbarPatch($2)"
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
    chatBarIcon: (slateProps: any) => (
        <ErrorBoundary noop>
            <IconWithTooltip text="Open SoundBoard Log" icon={<LogIcon className="chatBarLogIcon" />} onClick={openSoundBoardLog} />
        </ErrorBoundary>
    ),
    toolbarPatch: obj => {
        if (!obj?.props?.children) return obj;
        obj.props.children = [<IconWithTooltip text="Open SoundBoard Log" icon={<LogIcon className="chatBarLogIcon" />} onClick={openSoundBoardLog} />, ...obj.props.children];
        return obj;
    }
});
