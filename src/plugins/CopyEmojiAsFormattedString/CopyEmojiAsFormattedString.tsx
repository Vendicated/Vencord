/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { addContextMenuPatch, removeContextMenuPatch } from "@api/ContextMenu";
import {  Menu, React, Toasts, Clipboard } from "@webpack/common";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { showToast } from "@webpack/common";



interface Emoji {
    type: "emoji",
    id: string,
    name: string;
}

export default definePlugin({
    name: "CopyEmojiAsFormattedString",
    description: "Adds button to copy emoji as formatted string!",
    authors: [Devs.HAPPY_ENDERMAN],
    expressionPickerPatch(children, props) {
        if (!children.find(element=>element.props.id === "copy-formatted-string")) {
            let data = props.target.dataset as Emoji;
            const firstChild = props.target.firstChild as HTMLImageElement;

            let isAnimated = firstChild && new URL(firstChild.src).pathname.endsWith(".gif");;
            if (data.type === "emoji" && data.id) {

                children.push(<Menu.MenuItem
                    id="copy-formatted-string"
                    key="copy-formatted-string"
                    label={`Copy as formatted string`}
                    action={() => {
                        const formatted_emoji_string = `${isAnimated ? "<a:" : "<:"}${data.name}:${data.id}>`;
                        Clipboard.copy(formatted_emoji_string);
                        showToast("Success! Copied to clipboard as formatted string.", Toasts.Type.SUCCESS);
                    }}
                />);
            }
            props.alreadyPatched = true;
        }
    },
    start() {
        addContextMenuPatch("expression-picker", this.expressionPickerPatch);
    },
    stop() {
        removeContextMenuPatch("expression-picker", this.expressionPickerPatch);
    }


});
