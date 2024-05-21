/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addChatBarButton, ChatBarButton } from "@api/ChatButtons";
import { Devs } from "@utils/constants";
import { closeModal, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { React } from "@webpack/common";

import BoardModal from "./BoardApp/BoardModal";


const openBoard: ChatBarButton = () => {
    // the image is subject to change
    return (
        <ChatBarButton onClick={() => openModal(props => <BoardModal modalProps={props} />, { modalKey: "DrawboardFrame", onCloseRequest: () => { closeModal("DrawboardFrame"); } })} tooltip={""}>
            <img src="https://raw.githubusercontent.com/TheOriginalAyaka/sekai-stickers/main/public/img/emutest.png" width={16} height={16} />
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "Drawboard",
    description: "A worser version of a real image editor",
    authors: [Devs.MaiKokain],
    start() {
        addChatBarButton("DrawboardModal", openBoard);
    },
});
