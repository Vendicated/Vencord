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

import "./styles.css";

import { Devs } from "@utils/constants";
import { openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { Button, ButtonLooks, ButtonWrapperClasses, Tooltip } from "@webpack/common";

import { settings } from "./settings";
import { TranslateIcon } from "./TranslateIcon";
import { TranslateModal } from "./TranslateModal";
import { translate } from "./utils";

export default definePlugin({
    name: "Translate",
    description: "Translate messages with Google Translate",
    authors: [Devs.Ven],

    settings,

    translate,

    patches: [
        {
            find: ".activeCommandOption",
            replacement: {
                match: /(.)\.push.{1,30}disabled:(\i),.{1,20}\},"gift"\)\)/,
                replace: "$&;try{$2||$1.push($self.chatBarIcon())}catch{}",
            }
        },
    ],

    chatBarIcon() {
        return (
            <Tooltip text="Open Translate Modal">
                {({ onMouseEnter, onMouseLeave }) => (
                    <div style={{ display: "flex" }}>
                        <Button
                            aria-haspopup="dialog"
                            aria-label=""
                            size=""
                            look={ButtonLooks.BLANK}
                            onMouseEnter={onMouseEnter}
                            onMouseLeave={onMouseLeave}
                            innerClassName={ButtonWrapperClasses.button}
                            onClick={() =>
                                openModal(props => (
                                    <TranslateModal rootProps={props} />
                                ))
                            }
                            style={{ padding: "0 4px" }}
                        >
                            <div className={ButtonWrapperClasses.buttonWrapper}>
                                <TranslateIcon />
                            </div>
                        </Button>
                    </div>
                )}
            </Tooltip>
        );
    },
});
