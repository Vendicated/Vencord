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
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";

import { Emitter, ScreenshareSettingsIcon } from "../philsPluginLibrary";
import { PluginInfo } from "./constants";
import { openScreenshareModal } from "./modals";
import { ScreenshareAudioPatcher, ScreensharePatcher } from "./patchers";
import { GoLivePanelWrapper, replacedSubmitFunction } from "./patches";
import { initScreenshareAudioStore, initScreenshareStore } from "./stores";

const Button = findComponentByCodeLazy(".NONE,disabled:", ".PANEL_BUTTON");

function screenshareSettingsButton() {

    return (
        <Button
            tooltipText="Change screenshare settings"
            icon={ScreenshareSettingsIcon}
            role="button"
            onClick={openScreenshareModal}
        />
    );
}

export default definePlugin({
    name: "BetterScreenshare",
    description: "This plugin allows you to further customize your screen sharing.",
    authors: [Devs.viciouscal],
    dependencies: ["PhilsPluginLibrary"],
    patches: [
        {
            find: "GoLiveModal: user cannot be undefined", // Module: 60594; canaryRelease: 364525; L431
            replacement: {
                match: /onSubmit:(\w+)/,
                replace: "onSubmit:$self.replacedSubmitFunction($1)"
            }
        },
        {
            find: "StreamSettings: user cannot be undefined", // Module: 641115; canaryRelease: 364525; L254
            replacement: {
                match: /\(.{0,10}(,{.{0,100}modalContent)/,
                replace: "($self.GoLivePanelWrapper$1"
            }
        },
        {
            find: "#{intl::ACCOUNT_SPEAKING_WHILE_MUTED}",
            replacement: {
                match: /className:\i\.buttons,.{0,50}children:\[/,
                replace: "$&$self.screenshareSettingsButton(),"
            }
        }
    ],
    settings: definePluginSettings({
        hideDefaultSettings: {
            type: OptionType.BOOLEAN,
            description: "Hide Discord screen sharing settings",
            default: true,
        }
    }),
    start(): void {
        initScreenshareStore();
        initScreenshareAudioStore();
        this.screensharePatcher = new ScreensharePatcher().patch();
        this.screenshareAudioPatcher = new ScreenshareAudioPatcher().patch();

    },
    stop(): void {
        this.screensharePatcher?.unpatch();
        this.screenshareAudioPatcher?.unpatch();
        Emitter.removeAllListeners(PluginInfo.PLUGIN_NAME);
    },
    toolboxActions: {
        "Open Screenshare Settings": openScreenshareModal
    },
    replacedSubmitFunction,
    GoLivePanelWrapper,
    screenshareSettingsButton
});
