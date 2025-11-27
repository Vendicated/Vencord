/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";

import SekaiStickersModal from "./Components/SekaiStickersModal";
import { kanadeSvg } from "./kanade.svg";

const settings = definePluginSettings({
    AutoCloseModal: {
        type: OptionType.BOOLEAN,
        description: "Auto close modal when done",
        default: true
    }
});

const SekaiStickerChatButton: ChatBarButtonFactory = () => {
    return (
        <ChatBarButton onClick={() => openModal(props => <SekaiStickersModal modalProps={props} settings={settings} />)} tooltip="Sekai Stickers">
            {kanadeSvg()}
        </ChatBarButton>
    );
};

let IS_FONTS_LOADED = false;
export default definePlugin({
    name: "SekaiStickers",
    description: "Sekai Stickers built in discord originally from github.com/TheOriginalAyaka",
    authors: [Devs.MaiKokain],
    settings,
    chatBarButton: {
        icon: kanadeSvg,
        render: SekaiStickerChatButton
    },
    async start() {
        const fonts = [{ name: "YurukaStd", url: "https://raw.githubusercontent.com/TheOriginalAyaka/sekai-stickers/47a2ca33b8cb35f59800e8faad48980e4ce5ea71/src/fonts/YurukaStd.woff2" }, { name: "SSFangTangTi", url: "https://raw.githubusercontent.com/TheOriginalAyaka/sekai-stickers/main/src/fonts/ShangShouFangTangTi.woff2" }];
        if (!IS_FONTS_LOADED) {
            fonts.map(n => {
                new FontFace(n.name, `url(${n.url})`).load().then(
                    font => { document.fonts.add(font); },
                    err => { console.log(err); }
                );
            });
            IS_FONTS_LOADED = true;
        }
    },
});
