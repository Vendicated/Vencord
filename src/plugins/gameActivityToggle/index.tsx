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

import { getSettingStoreLazy } from "@api/SettingsStore";
import { disableStyle, enableStyle } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByCodeLazy } from "@webpack";

import style from "./style.css?managed";

const ShowCurrentGame = getSettingStoreLazy<boolean>("status", "showCurrentGame");
const Button = findByCodeLazy("Button.Sizes.NONE,disabled:");

function makeIcon(showCurrentGame?: boolean) {
    return function () {
        return (
            <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
            >
                <path fill="currentColor" mask="url(#gameActivityMask)" d="M4.55 19q-1.275 0-1.975-.887T2.05 15.95l1.05-7.5q.225-1.5 1.338-2.475T7.05 5h9.9q1.5 0 2.613.975t1.337 2.475l1.05 7.5q.175 1.275-.525 2.163T19.45 19q-.525 0-.975-.187T17.65 18.25l-2.25-2.25H8.6l-2.25 2.25q-.375.375-.825.563t-.975.188Zm12.45-6q.425 0 .712-.288T18 12q0-.425-.288-.713T17 11q-.425 0-.712.287T16 12q0 .425.288 .712T17 13Zm-2-3q.425 0 .713-.288T16 9q0-.425-.287-.713T15 8q-.425 0-.712.287T14 9q0 .425.288 .712T15 10ZM7.75 13h1.5v-1.75h1.75v-1.5h-1.75v-1.75h-1.5v1.75h-1.75v1.5h1.75v1.75Z" />
                {!showCurrentGame && <>
                    <mask id="gameActivityMask" >
                        <rect fill="white" x="0" y="0" width="24" height="24" />
                        <path fill="black" d="M22.27 5.54 18.46 1.73 1.73 18.46 5.54 22.27 22.27 5.54Z"/>
                    </mask>
                    <path fill="var(--status-danger)" d="M21 4.27L19.73 3L3 19.73L4.27 21L8.46 16.82L9.69 15.58L11.35 13.92L14.99 10.28L21 4.27Z" />
                </>}
            </svg>
        );
    };
}

function GameActivityToggleButton() {
    const showCurrentGame = ShowCurrentGame?.useSetting();

    return (
        <Button
            tooltipText={showCurrentGame ? "Disable Game Activity" : "Enable Game Activity"}
            icon={makeIcon(showCurrentGame)}
            role="switch"
            aria-checked={!showCurrentGame}
            onClick={() => ShowCurrentGame?.updateSetting(old => !old)}
        />
    );
}

export default definePlugin({
    name: "GameActivityToggle",
    description: "Adds a button next to the mic and deafen button to toggle game activity.",
    authors: [Devs.Nuckyz, Devs.RuukuLada],
    dependencies: ["SettingsStoreAPI"],

    patches: [
        {
            find: ".Messages.ACCOUNT_SPEAKING_WHILE_MUTED",
            replacement: {
                match: /this\.renderNameZone\(\).+?children:\[/,
                replace: "$&$self.GameActivityToggleButton(),"
            }
        }
    ],

    GameActivityToggleButton: ErrorBoundary.wrap(GameActivityToggleButton, { noop: true }),

    start() {
        enableStyle(style);
    },

    stop() {
        disableStyle(style);
    }
});
