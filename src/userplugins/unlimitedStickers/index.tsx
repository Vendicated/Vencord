/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 chev
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin, { OptionType } from "@utils/types";
import { Devs } from "@utils/constants";
import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { openStickerPicker } from "./StickerPicker";
import { ImageIcon } from "@components/Icons";
import { ChannelStore } from "@webpack/common";
import { definePluginSettings } from "@api/Settings";
import { getPluginIntlMessage } from "./intl";

export const settings = definePluginSettings({
    stickerPath: {
        type: OptionType.STRING,
        description: "The absolute path to your local stickers folder. This folder should contain sub-folders for each sticker category.",
        placeholder: "e.g., /home/user/Pictures/Stickers or C:\\Users\\User\\Pictures\\Stickers",
    },
}).withPrivateSettings<{
    stickerGuildId: string | null;
    stickerSlotId: string | null;
}>();

export const UnlimitedStickersChatBarIcon: ChatBarButtonFactory = (props) => {
    const channel = ChannelStore.getChannel(props.channel.id);
    if (!channel) return null;
    if (props.disabled) return null;

    return (
        <ChatBarButton
            tooltip={getPluginIntlMessage("OPEN_LOCAL_STICKER_PICKER")}
            onClick={() => openStickerPicker(channel)}
        >
            <ImageIcon width={24} height={24} />
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "UnlimitedStickers",
    description: "Send local images as stickers by temporarily uploading them to a private server.",
    authors: [Devs.chev],
    settings,
    renderChatBarButton: UnlimitedStickersChatBarIcon
});