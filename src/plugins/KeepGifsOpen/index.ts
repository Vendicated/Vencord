/*
* Vencord, a Discord client mod
* Copyright (c) 2025 merex*
* SPDX-License-Identifier: GPL-3.0-or-later
*/

import { Devs } from "@utils/constants";
import { sendMessage, getCurrentChannel } from "@utils/discord";
import definePlugin from "@utils/types";
import { ExpressionPickerStore } from "@webpack/common";

export default definePlugin({
    name: "KeepGifsOpen",
    description: "Prevents the GIF picker from closing after sending a GIF if the Shift key is held.",
    authors: [Devs.merex],

    patches: [{
        find: '"handleSelectGIF",',
        replacement: {
            match: /"handleSelectGIF",(\i)=>\{/,
            replace: '"handleSelectGIF",$1=>{if (!this.props.className) return $self.handleSelect($1, event);'
        }
    }],

    handleSelect(gif?: { url: string; }, event?: KeyboardEvent) {
        var currentChannel = getCurrentChannel();
        if (!currentChannel) return;
        
        var id = currentChannel.id;

        if (event?.shiftKey) {
            if (gif) {
                sendMessage(id, { content: gif.url });
            }
        } else {
            if (gif) {
                sendMessage(id, { content: gif.url });
                ExpressionPickerStore.closeExpressionPicker();
            }
        }
    }
});