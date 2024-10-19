/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { FFmpeg } from "@ffmpeg/ffmpeg";

export interface CategoryImageProps {
    src: string;
    alt?: string;
    isActive?: boolean;
}

export interface LineSticker {
    animationUrl: string,
    fallbackStaticUrl?: string,
    id: string;
    popupUrl: string;
    soundUrl: string;
    staticUrl: string;
    type: string;
    stickerPackId: LineStickerPack["id"];
}

export interface LineEmoji {
    animationUrl: string;
    type: string;
    id: string;
    staticUrl: string;
    animationMainImages?: string[];
    staticMainImages?: string[];
    stickerPackId: LineStickerPack["id"];
    fallbackStaticUrl?: string;
}

export interface LineStickerPack {
    title: string;
    author: {
        name: string;
        url: string;
    },
    id: string;
    mainImage: LineSticker;
    stickers: LineSticker[];
}

export interface LineEmojiPack {
    title: string;
    author: {
        name: string;
        url: string;
    },
    id: string;
    mainImage: LineSticker;
    stickers: LineEmoji[];
}

export interface PickerHeaderProps {
    onQueryChange: (query: string) => void;
}

export interface PickerContent {
    stickerPacks: StickerPack[];
    selectedStickerPackId?: string | null;
    setSelectedStickerPackId: React.Dispatch<React.SetStateAction<string | null>>;
    channelId: string;
    closePopout: () => void;
    query?: string;
}

export interface PickerContentHeader {
    image: string | React.ReactNode;
    title: string;
    children?: React.ReactNode;
    isSelected?: boolean;
    afterScroll?: () => void;
    beforeScroll?: () => void;
}

export interface PickerContentRow {
    rowIndex: number;
    grid1: PickerContentRowGrid;
    grid2?: PickerContentRowGrid;
    grid3?: PickerContentRowGrid;
    channelId: string;
}

export interface PickerContentRowGrid {
    rowIndex: number;
    colIndex: number;
    sticker: Sticker;
    onHover: (sticker: Sticker | null) => void;
    isHovered?: boolean;
    channelId?: string;
    onSend?: (sticker?: Sticker, shouldClose?: boolean) => void;
}

export enum SettingsTabsKey {
    ADD_STICKER_PACK_URL = "Add from URL",
    ADD_STICKER_PACK_HTML = "Add from HTML",
    ADD_STICKER_PACK_FILE = "Add from File",
}

export interface SidebarProps {
    packMetas: StickerCategoryType[];
    onPackSelect: (category: StickerCategoryType) => void;
}

export interface Sticker {
    id: string;
    image: string;
    title: string;
    stickerPackId: StickerPackMeta["id"];
    filename?: string;
    isAnimated?: boolean;
}

export interface StickerCategoryType {
    id: string;
    name: string;
    iconUrl?: string;
}

export interface StickerCategoryProps {
    children: React.ReactNode;
    onClick?: () => void;
    isActive: boolean;
    style?: React.CSSProperties;
}

export interface StickerPackMeta {
    id: string;
    title: string;
    author?: {
        name: string;
        url?: string;
    };
    logo: Sticker;
}

export interface StickerPack extends StickerPackMeta {
    stickers: Sticker[];
}

export interface FFmpegState {
    ffmpeg?: FFmpeg;
    isLoaded: boolean;
}
