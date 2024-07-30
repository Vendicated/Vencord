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
import { insertTextIntoChatInputBox, sendMessage } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { ExpressionPickerStore, SelectedChannelStore } from "@webpack/common";

let shiftHeld = false;

const enum PickBehavior {
    InputBox,
    Send,
}

export const settings = definePluginSettings({
    behavior: {
        description: "Modify the default behavior when selecting a gif",
        type: OptionType.SELECT,
        options: [
            { label: "Insert link into the chatbox", value: PickBehavior.InputBox, default: true },
            { label: "Instantly send", value: PickBehavior.Send },
        ],
    },
    shiftOverride: {
        description: "Use alternate behavior when holding shift",
        type: OptionType.BOOLEAN,
        default: true
    },
});

export default definePlugin({
    name: "GifPaste",
    authors: [Devs.Ven, Devs.iilwy],
    description: "Makes picking a gif in the gif picker insert a link into the chatbox instead of instantly sending it",
    settings,

    patches: [{
        find: '"handleSelectGIF",',
        replacement: {
            match: /"handleSelectGIF",(\i)=>\{/,
            replace: '"handleSelectGIF",$1=>{if (!this.props.className) return $self.handleSelect($1);'
        }
    }],

    start() {
        document.addEventListener("keyup", handleKeyEvent);
        document.addEventListener("keydown", handleKeyEvent);
    },

    stop() {
        document.removeEventListener("keyup", handleKeyEvent);
        document.removeEventListener("keydown", handleKeyEvent);
    },

    handleSelect(gif?: { url: string; }) {
        if (!gif) return;
        const preferSend = settings.store.behavior === PickBehavior.Send;
        const shouldSend = settings.store.shiftOverride ? preferSend !== shiftHeld : preferSend;
        if (shouldSend) {
            sendMessage(SelectedChannelStore.getChannelId(), { content: gif.url });
        } else {
            insertTextIntoChatInputBox(gif.url + " ");
        }
        ExpressionPickerStore.closeExpressionPicker();
    }
});

function handleKeyEvent(event: KeyboardEvent) {
    shiftHeld = event.shiftKey;
}
