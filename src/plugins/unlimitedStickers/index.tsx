/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 chev
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton, type ChatBarButtonFactory } from "@api/ChatButtons";
import * as DataStore from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import { ImageIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, Toasts, UserStore } from "@webpack/common";
import { getPluginIntlMessage } from "./intl";
import { openStickerPicker } from "./StickerPicker";

export const FAVORITES_KEY = "UnlimitedStickers_Favorites";
export const RECENT_KEY = "UnlimitedStickers_Recent";
export const RECENT_LIMIT = 16;
export const FAVORITES_EXPANDED_KEY = "UnlimitedStickers_FavoritesExpanded";
export const RECENT_EXPANDED_KEY = "UnlimitedStickers_RecentExpanded";

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

/**
 * Retrieves the list of favorite sticker paths from storage.
 * @returns A promise that resolves to an array of sticker paths.
 */
export const getFavorites = async (): Promise<string[]> => {
    return (await DataStore.get<string[]>(FAVORITES_KEY)) ?? [];
};

/**
 * Saves the list of favorite sticker paths to storage.
 * @param favorites An array of sticker paths to save.
 * @returns A promise that resolves when the data is saved.
 */
export const saveFavorites = async (favorites: string[]): Promise<void> => {
    await DataStore.set(FAVORITES_KEY, favorites);
};

/**
 * Retrieves the list of recently used sticker paths from storage.
 * @returns A promise that resolves to an array of sticker paths.
 */
export const getRecentStickers = async (): Promise<string[]> => {
    return (await DataStore.get<string[]>(RECENT_KEY)) ?? [];
};

/**
 * Adds a sticker path to the top of the recently used list.
 * @param stickerPath The path of the sticker to add.
 * @returns A promise that resolves when the list is updated.
 */
export const addRecentSticker = async (stickerPath: string): Promise<void> => {
    await DataStore.update<string[]>(RECENT_KEY, (recents = []) => {
        const index = recents.indexOf(stickerPath);
        if (index > -1) {
            recents.splice(index, 1);
        }
        recents.unshift(stickerPath);
        if (recents.length > RECENT_LIMIT) {
            recents.length = RECENT_LIMIT;
        }
        return recents;
    });
};

/**
 * Retrieves the expansion state for a given category key.
 * @param key The key for the expansion state.
 * @returns A promise resolving to true if expanded, false otherwise. Defaults to true.
 */
export const getExpansionState = async (key: string): Promise<boolean> => {
    return (await DataStore.get<boolean>(key)) ?? true;
};

/**
 * Saves the expansion state for a category.
 * @param key The key for the expansion state.
 * @param isExpanded The new expansion state.
 * @returns A promise that resolves when the state is saved.
 */
export const saveExpansionState = async (
    key: string,
    isExpanded: boolean,
): Promise<void> => {
    await DataStore.set(key, isExpanded);
};

export const UnlimitedStickersChatBarIcon: ChatBarButtonFactory = (props) => {
    const channel = ChannelStore.getChannel(props.channel.id);
    if (!channel) return null;
    if (props.disabled) return null;

    const handleButtonClick = () => {
        const currentUser = UserStore.getCurrentUser();
        // Require Nitro to use plugin (since you can't really use the stickers without it)
        if (currentUser?.premiumType != null) {
            openStickerPicker(channel);
        } else {
            Toasts.show({
                message: getPluginIntlMessage("NITRO_REQUIRED_BODY"),
                id: Toasts.genId(),
                type: Toasts.Type.FAILURE,
            });
        }
    };

    return (
        <ChatBarButton
            tooltip={getPluginIntlMessage("OPEN_LOCAL_STICKER_PICKER")}
            onClick={handleButtonClick}
        >
            <ImageIcon width={24} height={24} />
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "UnlimitedStickers",
    description:
        "Send local images as stickers by temporarily uploading them to a private server.",
    authors: [Devs.chev],
    settings,
    renderChatBarButton: UnlimitedStickersChatBarIcon,
});
