/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import { insertTextIntoChatInputBox } from "@utils/discord";
import definePlugin from "@utils/types";
import { filters, mapMangledModuleLazy } from "@webpack";

const ExpressionPickerState = mapMangledModuleLazy('name:"expression-picker-last-active-view"', {
    close: filters.byCode("activeView:null", "setState")
});

export default definePlugin({
    name: "GifPaste",
    description: "Makes picking a gif in the gif picker insert a link into the chatbox instead of instantly sending it",
    authors: [Devs.Ven],

    patches: [{
        find: ".handleSelectGIF=",
        replacement: {
            match: /\.handleSelectGIF=function.+?\{/,
            replace: ".handleSelectGIF=function(gif){return $self.handleSelect(gif);"
        }
    }],

    handleSelect(gif?: { url: string; }) {
        if (gif) {
            insertTextIntoChatInputBox(gif.url + " ");
            ExpressionPickerState.close();
        }
    }
});
