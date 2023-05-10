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
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import style from "./style.css?managed";

// export const settings = definePluginSettings({
//     showingAllowed: {
//         description: "Allow Blocked Messages to be opened",
//         type: OptionType.BOOLEAN,
//         default: true
//     }
// });

export default definePlugin({
    name: "Better Blocked Messages",
    description: "this changes blocked messages to be cleaner and better \n\n\nThanks to ArjixWasTaken for the patches code",
    authors: [Devs.IThundxr],
    // settings,
    patches: [{
        find: "isBeforeGroup:",
        replacement: {
            match: /(\.collapsedReason;return\(0,\w\.jsx\)\(\w+\.Z,{.*?childrenMessageContent:\(0,\w\.jsx\)\()\w+\.Z,/,
            replace: (_, head) => `${head}$self.actionBarComponent,`
        }
    }],

    actionBarComponent(props: { children: React.ReactNode[]; compact: boolean; }) {
        // const { showingAllowed } = settings.use(["showingAllowed"]);
        return (
            <div>
                <div className="vc-betterblockedusers-main" id="---blocked-message-bar" role="separator">
                    <span className="vc-betterblockedusers-divider">
                        <svg className="vc-betterblockedusers-svg" aria-hidden="true" role="img" width="8" height="13" viewBox="0 0 8 13">
                            <path className="vc-betterblockedusers-color" stroke="currentColor" fill="transparent" d="M8.16639 0.5H9C10.933 0.5 12.5 2.067 12.5 4V9C12.5 10.933 10.933 12.5 9 12.5H8.16639C7.23921 12.5 6.34992 12.1321 5.69373 11.4771L0.707739 6.5L5.69373 1.52292C6.34992 0.86789 7.23921 0.5 8.16639 0.5Z"></path>
                        </svg>
                        <span className="vc-betterblockedusers-button" role="button" tabIndex={0}>Blocked Message</span>
                    </span>
                </div>
                {/* {showingAllowed ? (<props.originalComponent {...props} />) : null} */}
                {props.children}
                {/* {self.shouldShowContent(true)} */}
            </div>
        );
    },

    start() {
        enableStyle(style);
    },

    stop() {
        disableStyle(style);
    }
});
