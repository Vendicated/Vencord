/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { FluxDispatcher } from "@webpack/common";
import { enableStyle, disableStyle } from "@api/Styles";
import definePlugin from "@utils/types";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import styles from "./styles.css?managed";
import settings from "./settings";
import { getListeners } from "./utils";
import { LogIcon, IconWithTooltip } from "./components/Icons";
import { updateLoggedSounds } from "./store";
import { openSoundBoardLog } from "./components/SoundBoardLog";

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
        FluxDispatcher.subscribe("VOICE_CHANNEL_EFFECT_SEND", async (sound) => {
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
    toolbarPatch: (obj) => {
        if (!obj?.props?.children) return obj;
        obj.props.children = [<IconWithTooltip text="Open SoundBoard Log" icon={<LogIcon className="chatBarLogIcon" />} onClick={openSoundBoardLog} />, ...obj.props.children];
        return obj;
    }
});