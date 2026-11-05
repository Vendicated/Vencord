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

import { ChatBarButton } from "@api/ChatButtons";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";

import { LogIcon } from "./components/Icons";
import { openSoundBoardLog } from "./components/SoundBoardLog";
import settings from "./settings";
import { updateLoggedSounds } from "./store";
import styles from "./styles.css?managed";
import { getListeners, SoundEvent } from "./utils";

const HeaderBarIcon = findComponentByCodeLazy(".HEADER_BAR_BADGE_BOTTOM,", 'position:"bottom"');

export default definePlugin({
    name: "SoundBoardLogger",
    authors: [
        { id: 843448897737064448n, name: "Fres" },
        Devs.Moxxie
    ],
    description: "Logs soundboard sounds played in a voice chat and allows you to download them",
    settings,
    managedStyle: styles,
    patches: [{
        predicate: () => settings.store.IconLocation === "toolbar",
        find: '?"BACK_FORWARD_NAVIGATION":',
        replacement: {
            match: /(trailing:.{0,200}?\{children:\[)/,
            replace: "$1$self.renderToolbarButton(),"
        }
    }],
    chatBarButton: {
        icon: LogIcon,
        render: ({ isMainChat }) => isMainChat && settings.store.IconLocation === "chat" ? (
            <ChatBarButton tooltip="Open SoundBoard Log" onClick={openSoundBoardLog}>
                <LogIcon />
            </ChatBarButton>
        ) : null
    },
    flux: {
        async VOICE_CHANNEL_EFFECT_SEND(sound: SoundEvent) {
            if (!sound.soundId) return;
            await updateLoggedSounds(sound);
            getListeners().forEach(cb => cb());
        }
    },
    renderToolbarButton: ErrorBoundary.wrap(() => (
        <HeaderBarIcon key="vc-soundlog-toolbar" tooltip="Open SoundBoard Log" icon={LogIcon} onClick={openSoundBoardLog} />
    ), { noop: true })
});
