/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { ModalContent, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { React, Text } from "@webpack/common";

import { CategoryImage } from "./categoryImage";
import { CategoryScroller } from "./categoryScroller";
import { CategoryWrapper } from "./categoryWrapper";
import { CogIcon, RecentlyUsedIcon } from "./icons";
import { RECENT_STICKERS_ID, RECENT_STICKERS_TITLE } from "./recent";
import { Settings } from "./settings";
import { StickerCategory } from "./stickerCategory";
import { cl, clPicker } from "../utils";

export interface StickerCategory {
    id: string;
    name: string;
    iconUrl?: string;
}

export interface SidebarProps {
    packMetas: StickerCategory[];
    onPackSelect: (category: StickerCategory) => void;
}

export const RecentPack = {
    id: RECENT_STICKERS_ID,
    name: RECENT_STICKERS_TITLE,
} as StickerCategory;

export const PickerSidebar = ({ packMetas, onPackSelect }: SidebarProps) => {
    const [activePack, setActivePack] = React.useState<StickerCategory>(RecentPack);
    const [hovering, setHovering] = React.useState(false);

    return (
        <CategoryWrapper>
            <CategoryScroller categoryLength={packMetas.length}>
                <StickerCategory
                    style={{ padding: "4px", boxSizing: "border-box", width: "32px" }}
                    isActive={activePack === RecentPack}
                    onClick={() => {
                        if (activePack === RecentPack) return;

                        onPackSelect(RecentPack);
                        setActivePack(RecentPack);
                    }}
                >
                    <RecentlyUsedIcon width={24} height={24} color={
                        activePack === RecentPack ? " var(--interactive-active)" : "var(--interactive-normal)"
                    } />
                </StickerCategory>
                {
                    ...packMetas.map(pack => {
                        return (
                            <StickerCategory
                                key={pack.id}
                                onClick={() => {
                                    if (activePack?.id === pack.id) return;

                                    onPackSelect(pack);
                                    setActivePack(pack);
                                }}
                                isActive={activePack?.id === pack.id}
                            >
                                <CategoryImage src={pack.iconUrl!} alt={pack.name} isActive={activePack?.id === pack.id} />
                            </StickerCategory>
                        );
                    })
                }
            </CategoryScroller>
            <div className={clPicker("settings-cog-container")}>
                <button
                    className={clPicker("settings-cog") + (
                        hovering ? ` ${clPicker('settings-cog-active')}` : ""
                    )}
                    onClick={() => {
                        openModal(modalProps => {
                            return (
                                <ModalRoot size={ModalSize.LARGE} {...modalProps}>
                                    <ModalHeader>
                                        <Text tag="h2">Stickers+</Text>
                                    </ModalHeader>
                                    <ModalContent>
                                        <Settings />
                                    </ModalContent>
                                </ModalRoot>
                            );
                        });
                    }}
                    onMouseEnter={() => setHovering(true)}
                    onMouseLeave={() => setHovering(false)}
                >
                    <CogIcon width={20} height={20} />
                </button>
            </div>
        </CategoryWrapper>
    );
};
