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

const UnlimitedStickerIcon: React.FC<{ className?: string; width?: number; height?: number; }> = ({
    className,
    width = 20,
    height = 20,
}) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        viewBox="0 0 24 24"
        width={width}
        height={height}
        className={className}
    >
        <defs>
            <clipPath id="c">
                <path d="M0 0h24v24H0z" />
            </clipPath>
            <clipPath id="d">
                <path d="M0 0h600v600H0z" />
            </clipPath>
            <filter id="a" filterUnits="objectBoundingBox" x="0%" y="0%" width="100%" height="100%">
                <feComponentTransfer in="SourceGraphic">
                    <feFuncA type="table" tableValues="1.0 0.0" />
                </feComponentTransfer>
            </filter>
            <path
                fill="#C4C5C9"
                d="M-5.5-2a1.5 1.5 0 1 0-.001-3.001A1.5 1.5 0 0 0-5.5-2M7-3.5a1.5 1.5 0 1 1-3.001-.001A1.5 1.5 0 0 1 7-3.5M-2.911-.556A1.001 1.001 0 0 0-4.573.556 5.5 5.5 0 0 0 0 3 5.5 5.5 0 0 0 4.573.556 1 1 0 1 0 2.911-.556 3.5 3.5 0 0 1 0 1 3.5 3.5 0 0 1-2.911-.556"
                transform="matrix(25 0 0 25 300 300)"
                style={{ display: 'block' }}
                id="b"
            />
            <mask id="e" style={{ maskType: 'alpha' }}>
                <g filter="url(#a)">
                    <path fill="#fff" opacity="0" d="M0 0h600v600H0z" />
                    <use href="#b" />
                </g>
            </mask>
        </defs>
        <g clipPath="url(#c)">
            <g clipPath="url(#d)" transform="rotate(.012) scale(.04)" style={{ display: 'block' }}>
                <g mask="url(#e)" style={{ display: 'block' }}>
                    <path
                        fill="#C4C5C9"
                        d="M150 50h300a100 100 0 0 1 100 100v187.5a12.5 12.5 0 0 1-12.5 12.5H475a125 125 0 0 0-125 125v62.5a12.5 12.5 0 0 1-12.5 12.5H150A100 100 0 0 1 50 450V150A100 100 0 0 1 150 50"
                    />
                </g>
                <g transform="translate(355 355) scale(10)">
                    <path
                        d="m8.121 9.879 2.083 2.083.007-.006 1.452 1.452.006.006 2.122 2.122a5 5 0 1 0 0-7.072l-.714.714 1.415 1.414.713-.713a3 3 0 1 1 0 4.242l-2.072-2.072-.007.006-3.59-3.59a5 5 0 1 0 0 7.07l.713-.713-1.414-1.414-.714.713a3 3 0 1 1 0-4.242"
                        fill="#C4C5C9"
                    />
                </g>
            </g>
        </g>
    </svg>
);

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
            <UnlimitedStickerIcon width={20} height={20} />
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
