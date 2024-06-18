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
import { insertTextIntoChatInputBox } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { ComponentDispatch } from "@webpack/common";

const { closeExpressionPicker } = findByPropsLazy("closeExpressionPicker");
const clearChatInputBox = () => ComponentDispatch.dispatchToLastSubscribed("CLEAR_TEXT");

const settings = definePluginSettings({
    commandBehavior: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Should plugin's behavior be the same for commands?",
        restartNeeded: true
    }
});

export default definePlugin({
    name: "GifPaste",
    description: "Makes picking a gif in the gif picker insert a link into the chatbox instead of instantly sending it",
    authors: [Devs.Ven],
    settings,

    patches: [
        {
            find: '"handleSelectGIF",',
            replacement: {
                match: /"handleSelectGIF",(\i)=>\{/,
                replace: '"handleSelectGIF",$1=>{if (!this.props.className) return $self.handleSelect($1);'
            }
        },
        {
            find: "(this,\"handleMouseEnter\",()=>{let{onHover",
            replacement: {
                match: /let{onClick:\i,index:\i}=this\.props;/,
                replace: "$&if (this.props.url && $self.shouldCopyFromCmd) return $self.handleSelect(this.props, true);"
            }
        }
    ],

    get shouldCopyFromCmd() {
        return settings.store.commandBehavior;
    },

    handleSelect(gif?: { url: string; }, isCommand = false) {
        if (gif?.url) {
            if (isCommand) clearChatInputBox();
            setTimeout(() => insertTextIntoChatInputBox(gif.url + " "), 0);
            if (!isCommand) closeExpressionPicker();
        }
    }
});
