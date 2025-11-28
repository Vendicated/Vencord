/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2025 Vendicated and contributors
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

// @ts-nocheck
// mfw i fucking hate unexplainable errors
// also yeah im new to type script :/ i only have expereince with c# so i learnt as i went -doomah

import definePlugin, { OptionType } from "@utils/types";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { useCallback, useEffect, useRef, useState, ExpressionPickerStore } from "@webpack/common";
import { insertTextIntoChatInputBox } from "@utils/discord";

export default definePlugin({
    name: "RandomFavouriteGifSend",
    authors: [Devs.doomah],
    description: "Adds a random gif sender button to favourite gifs tab.",
    patches: [
        {
            find: "renderHeaderContent()",
            replacement: [
                {
                    match: /(renderHeaderContent\(\).{1,150}FAVORITES:return)(.{1,150});(case.{1,200}default:return\(0,\i\.jsx\)\((?<searchComp>\i\..{1,10}),)/,
                    replace: "$1 this.state.resultType === 'Favorites' ? (this.state.resultType === 'Favorites' ? (function(){try{const el = $self.renderSearchBar(this, $<searchComp>);}catch(e){} return $self.renderFavButton(this, $<searchComp>);})() : $self.renderSearchBar(this, $<searchComp>)) : $2;$3"
                },
                {
                    match: /(,suggestions:\i,favorites:)(\i),/,
                    replace: "$1$self.getFav($2),favCopy:$2,"
                }
            ]
        }
    ],
    instance: null,
    renderFavButton(instance: any, SearchBarComponent: any) {
        this.instance = instance;
        return (
            <ErrorBoundary noop>
                <GambleButton instance={instance} />
            </ErrorBoundary>
        );
    },
    getFav(favorites: any[]) {
        const inst: any = (this as any).instance;
        if (!inst || inst.dead) return favorites;
        const { favorites: filteredFavorites } = inst.props;
        return filteredFavorites != null && filteredFavorites?.length !== favorites.length ? filteredFavorites : favorites;
    }
});

function extractUrlFromStyle(style: string | null): string | null {
    if (!style) return null;
    const m = style.match(/url\((?:"|'|)(.+?)(?:"|'|)\)/);
    return m ? m[1] : null;
}


function GambleButton({ instance }: { instance: any }) {
    const containerRef = useRef<HTMLDivElement | null>(null);

    // following some stupid ass advice from the js support channel

    const getAllFavorites = (): any[] => {
        try {
            const V = (window as any).Vencord ?? (window as any).VencordWeb ?? (window as any).VencordWebpack ?? (window as any);
            const wp = V?.Webpack ?? (window as any).Webpack ?? V?.wp;
            const findStore = wp?.findStore ?? wp?.findStoreLazy ?? null;
            if (typeof findStore === 'function') {
                try {
                    const store = wp.findStore("UserSettingsProtoStore");
                    const gifs = store?.frecencyWithoutFetchingLatest?.favoriteGifs?.gifs ?? store?.favoriteGifs?.gifs;
                    if (gifs && typeof gifs === 'object') {
                        const arr = Object.entries(gifs).map(([src]) => src);
                        if (arr.length) return arr;
                    }
                } catch (e) { }
            }
        } catch (e) { }

        return []; //thank you random kind stranger
    };

    const pickRandomGif = (list: any[]) => {
        if (!list || list.length === 0) return null;
        return list[Math.floor(Math.random() * list.length)];
    };

    const sendGifToCurrentChannel = async (gif: any) => {
        if (!gif) return false;
        const url = typeof gif === 'string' ? gif : (gif.src ?? gif);
        try {
            insertTextIntoChatInputBox(url + " ");
            try { ExpressionPickerStore.closeExpressionPicker(); } catch (e) {}
            return true;
        } catch (e) {
            await navigator.clipboard.writeText(url);
        }
    };

    const handleLeftClick = useCallback(async (e: any) => {
        e.stopPropagation();
        e.preventDefault();

        const all = getAllFavorites();

        const filtered = all;
        const gif = pickRandomGif(filtered);
        if (!gif) return;
        await sendGifToCurrentChannel(gif);
    }, [instance]);

    return (
        <div ref={containerRef} onMouseDown={e => e.stopPropagation()} onMouseUp={e => e.stopPropagation()} style={{ position: "absolute", right: 8, top: 6, zIndex: 99999, pointerEvents: "auto" }}>
            <div onClick={handleLeftClick} role="button" title={`Click to paste a random favorite GIF into the chat input.`} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, background: "var(--background-secondary)", boxShadow: "var(--elevation-medium)", cursor: "pointer", userSelect: "none" }}>
                <img
                    src="https://i5.walmartimages.com/asr/6c5de11e-499a-4e2f-9daf-1635daceb794.1b271a4bcdf6a8bead3d3c348c5ab29c.jpeg" // chance yayeyeyerys
                    style={{ width: 32, height: 32 }}
                    draggable={false}
                    onMouseDown={e => e.stopPropagation()}
                />
            </div>
        </div>
    );
}

