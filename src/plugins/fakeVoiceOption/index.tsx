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

import { disableStyle, enableStyle } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import definePlugin from "@utils/types";
import { findByCodeLazy } from "@webpack";

import { settings } from "./settings";
import style from "./style.css?managed";

const Button = findByCodeLazy("Button.Sizes.NONE,disabled:");

function makeIcon(enabled?: boolean) {
    return function () {
        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="19"
                height="19"
                viewBox="0 0 512 512"
            >
                <path fill="currentColor" d="M256 48C141.1 48 48 141.1 48 256v40c0 13.3-10.7 24-24 24s-24-10.7-24-24V256C0 114.6 114.6 0 256 0S512 114.6 512 256V400.1c0 48.6-39.4 88-88.1 88L313.6 488c-8.3 14.3-23.8 24-41.6 24H240c-26.5 0-48-21.5-48-48s21.5-48 48-48h32c17.8 0 33.3 9.7 41.6 24l110.4 .1c22.1 0 40-17.9 40-40V256c0-114.9-93.1-208-208-208zM144 208h16c17.7 0 32 14.3 32 32V352c0 17.7-14.3 32-32 32H144c-35.3 0-64-28.7-64-64V272c0-35.3 28.7-64 64-64zm224 0c35.3 0 64 28.7 64 64v48c0 35.3-28.7 64-64 64H352c-17.7 0-32-14.3-32-32V240c0-17.7 14.3-32 32-32h16z"/>
                {!enabled &&
                    <line
                        x1="495"
                        y1="10"
                        x2="10"
                        y2="464"
                        stroke="var(--status-danger)"
                        strokeWidth="40"
                    />
                }
            </svg>
        );
    };
}

function FakeVoiceOptionToggleButton() {
    const FakeMuteEnabled = settings.use(["fakeMute"]).fakeMute;
    const FakeDeafenEnabled = settings.use(["fakeDeafen"]).fakeDeafen;
    const Enabled = FakeDeafenEnabled && FakeMuteEnabled;

    return (
        <Button
            tooltipText={Enabled ? "Disable Fake/Deafen Mute" : "Enable Fake/Deafen Mute"}
            icon={makeIcon(Enabled)}
            role="switch"
            aria-checked={!Enabled}
            onClick={() => {
                settings.store.fakeDeafen = !Enabled;
                settings.store.fakeMute = !Enabled;
            }}
        />
    );
}


export default definePlugin({
    name: "Fake Voice Options",
    description: "fake mute & deafen",
    authors: [{
        name: "SaucyDuck",
        id: 1004904120056029256n,
    },
    {
        name: "GeorgeV22",
        id: 261487490769092608n,
    }],
    patches: [
        {
            find: ".Messages.ACCOUNT_SPEAKING_WHILE_MUTED",
            replacement: {
                match: /this\.renderNameZone\(\).+?children:\[/,
                replace: "$&$self.FakeVoiceOptionToggleButton(),"
            }
        },
        {
            find: "e.setSelfMute(n);",
            replacement: [{
                // prevent client-side mute
                match: /e\.setSelfMute\(n\);/g,
                replace: "e.setSelfMute(Vencord.Settings.plugins[\"Fake Voice Options\"].fakeMute?false:n);"
            },
            {
                // prevent client-side deafen
                match: /e\.setSelfDeaf\(t\.deaf\)/g,
                replace: "e.setSelfDeaf(Vencord.Settings.plugins[\"Fake Voice Options\"].fakeDeafen?false:t.deaf);"
            }]
        },
    ],
    FakeVoiceOptionToggleButton: ErrorBoundary.wrap(FakeVoiceOptionToggleButton, { noop: true }),
    settings,

    start() {
        enableStyle(style);
    },

    stop() {
        disableStyle(style);
    }
});
