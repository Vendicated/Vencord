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

import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { OptionType } from "@utils/types";

import { openSoundBoardLog } from "./components/SoundBoardLog";

const settings = definePluginSettings({
    SavedIds: {
        description: "Maximum number of different sounds to save (0 means unlimited)",
        type: OptionType.NUMBER,
        default: 50,
        isValid: value => typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    },
    PreviewVolume: {
        description: "Volume for sounds previewed in the logger",
        type: OptionType.SLIDER,
        markers: [0, 25, 50, 75, 100],
        default: 50,
        stickToMarkers: false
    },
    IconLocation: {
        description: "Where to show the SoundBoard Log icon",
        type: OptionType.SELECT,
        options: [
            { label: "Toolbar", value: "toolbar", default: true },
            { label: "Chat input", value: "chat" }
        ],
        restartNeeded: true
    },
    OpenLogs: {
        type: OptionType.COMPONENT,
        description: "Open the sound logs",
        component: () => <Button variant="link" size="small" onClick={openSoundBoardLog}>Open Logs</Button>
    }
});

export default settings;
