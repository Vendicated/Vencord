/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { openGalleryModal } from "./GalleryModal";
import { GalleryIcon } from "./Icons";

const GalleryChatBarIcon: ChatBarButtonFactory = ({ isAnyChat, channel }) => {
    if (!isAnyChat || !channel) return null;

    return (
        <ChatBarButton
            tooltip="Media Gallery"
            onClick={() => openGalleryModal(channel)}
        >
            <GalleryIcon className="vc-bm-chat-icon" />
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "BetterMedia",
    description: "Adds a Media / Files / Links / Pins gallery for the current channel, just like the mobile app. Click the gallery icon next to the message box to browse everything ever sent without scrolling through chat history.",
    tags: ["Chat", "Utility", "Media"],
    authors: [Devs.acivev],

    chatBarButton: {
        icon: GalleryIcon,
        render: GalleryChatBarIcon
    }
});
