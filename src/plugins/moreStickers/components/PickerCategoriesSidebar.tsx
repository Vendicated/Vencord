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

import { React } from "@webpack/common";

import { CategoryImage } from "./categoryImage";
import { CategoryScroller } from "./categoryScroller";
import { CategoryWrapper } from "./categoryWrapper";
import { RecentlyUsedIcon } from "./RecentlyUsedIcon";
import { StickerCategory } from "./StickerCategory";

export interface StickerCategory {
    id: string;
    packName: string;
    packIcon?: string;
}

export interface SidebarProps {
    categories: StickerCategory[];
    onCategorySelect: (category: StickerCategory) => void;
}

export const RecentPack = {
    id: "recent",
    packName: "Recently Used",
} as StickerCategory;

export const PickerSidebar = ({ categories, onCategorySelect }: SidebarProps) => {
    const [activeCategory, setActiveCategory] = React.useState<StickerCategory>(RecentPack);

    return (
        <CategoryWrapper>
            <CategoryScroller>
                <StickerCategory
                    style={{ padding: "4px", boxSizing: "border-box" }}
                    isActive={activeCategory === RecentPack}
                    onClick={() => {
                        if (activeCategory === RecentPack) return;

                        onCategorySelect(RecentPack);
                        setActiveCategory(RecentPack);
                    }}
                >
                    <RecentlyUsedIcon />
                </StickerCategory>
                {
                    ...categories.map(category => {
                        return (
                            <StickerCategory
                                key={category.id}
                                onClick={() => {
                                    if (activeCategory === category) return;

                                    onCategorySelect(category);
                                    setActiveCategory(category);
                                }}
                                isActive={activeCategory === category}
                            >
                                <CategoryImage src={category.packIcon!} alt={category.packName} isActive={activeCategory === category} />
                            </StickerCategory>
                        );
                    })
                }
            </CategoryScroller>
        </CategoryWrapper>
    );
};
