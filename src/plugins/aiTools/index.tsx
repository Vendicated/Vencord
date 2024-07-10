/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { addChatBarButton, removeChatBarButton } from "@api/ChatButtons";
import { addButton, removeButton } from "@api/MessagePopover";
import { classNameFactory } from "@api/Styles";
import { Devs } from "@utils/constants";
import { openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { ChannelStore } from "@webpack/common";

import { ImgGenBtn } from "./imgGenerationBtn";
import { ContextModal, messageContextMenu } from "./messageContextMenu";
import { TextGenBtn, TextGenIcon } from "./textGenerationBtn";

export const cl = classNameFactory("vc-at-");

export default definePlugin({
    name: "AI Tools",
    description: "Enhance your Discord experience with AI text & image generation",
    authors: [Devs.Millionxsam],
    contextMenus: {
        "message": messageContextMenu
    },
    start() {
        addChatBarButton("aiTextGen", TextGenBtn);
        addChatBarButton("aiImgGen", ImgGenBtn);
        addButton("aiReply", message => {
            if (!message.author || !message.content) return null;

            return {
                label: "AI Tools",
                icon: TextGenIcon,
                message,
                channel: ChannelStore.getChannel(message.channel_id),
                onClick: async () => openModal(props => <ContextModal message={message} props={props} />)
            };
        });
    },
    stop() {
        removeChatBarButton("aiTextGen");
        removeChatBarButton("aiImgGen");
        removeButton("aiReply");
    }
});
