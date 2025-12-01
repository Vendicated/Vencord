/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2025 Doomah
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

import { insertTextIntoChatInputBox } from "@utils/discord";
import definePlugin from "@utils/types";
import { findStoreLazy } from "@webpack";
import { ExpressionPickerStore, useCallback, useRef } from "@webpack/common";
import { Devs } from "../../utils";


export default definePlugin({
    name: "RandomFavouriteGifSend",
    authors: [Devs.doomah],
    description: "Adds a random gif sender button to favourite gifs tab.",
    patches: [{
        find: "renderHeaderContent()", replacement: [{
            match: /(children:\s*)(\i(?:\.\i)+\(\i(?:\.\i)+\))/, replace: "$1[$self.renderFavButton($2)]"
        }]
    }],
    instance: null,
    renderFavButton(title) {

        if (!Vencord.Plugins.isPluginEnabled("FavoriteGifSearch")) {
            return (<div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%"
            }}>
                {title}
                <GambleButton />
            </div>);
        }
        return <GambleButton />;
    },
    getFav(favorites) {
        return favorites;
    },
    start() {
        const favGifSearchBar = Vencord.Plugins.plugins.FavoriteGifSearch;
        if (!Vencord.Plugins.isPluginEnabled("FavoriteGifSearch")) return;

        const original = favGifSearchBar.renderSearchBar;
        favGifSearchBar.renderSearchBar = (...args) => {
            const jsx = original.apply(this, args);
            return (<>
                {jsx}
                {this.renderFavButton(this)}
            </>);
        };
    }
});

function GambleButton() {
    const containerRef = useRef(null);

    const gifs = Object.keys(findStoreLazy("UserSettingsProtoStore").frecencyWithoutFetchingLatest.favoriteGifs.gifs);

    const pickRandomGif = () => gifs[Math.floor(Math.random() * gifs.length)];

    const sendGif = async gif => {
        insertTextIntoChatInputBox(gif + " ");
        ExpressionPickerStore.closeExpressionPicker();
    };

    const handleClick = useCallback(async e => {
        e.stopPropagation();
        e.preventDefault();
        sendGif(pickRandomGif());
    }, []);
    if (!Vencord.Plugins.isPluginEnabled("FavoriteGifSearch")) return (
        <div ref={containerRef} onMouseDown={e => e.stopPropagation()} onMouseUp={e => e.stopPropagation()} style={{
            display: "flex",
            alignItems: "center",
            paddingLeft: 8,
            zIndex: 0,
            pointerEvents: "auto",
            position: "absolute",
            right: "15px"
        }}>
            <div onClick={handleClick} role="button"
                title="Click to paste a random favorite GIF into the chat input."
                style={{ cursor: "pointer", color: "var(--interactive-normal)", display: "flex" }}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                    style={{ width: 32, height: 32 }}
                    onMouseDown={e => e.stopPropagation()}>
                    <path
                        d="M8 8H8.01M16 8H16.01M12 12H12.01M16 16H16.01M8 16H8.01M7.2 20H16.8C17.9201 20 18.4802 20 18.908 19.782C19.2843 19.5903 19.5903 19.2843 19.782 18.908C20 18.4802 20 17.9201 20 16.8V7.2C20 6.0799 20 5.51984 19.782 5.09202C19.5903 4.71569 19.2843 4.40973 18.908 4.21799C18.4802 4 17.9201 4 16.8 4H7.2C6.0799 4 5.51984 4 5.09202 4.21799C4.71569 4.40973 4.40973 4.71569 4.21799 5.09202C4 5.51984 4 6.07989 4 7.2V16.8C4 17.9201 4 18.4802 4.21799 18.908C4.40973 19.2843 4.71569 19.5903 5.09202 19.782C5.51984 20 6.07989 20 7.2 20Z"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
            </div>
        </div>);

    return (<div ref={containerRef} onMouseDown={e => e.stopPropagation()} onMouseUp={e => e.stopPropagation()} style={{
        marginLeft: "auto",
        display: "flex",
        alignItems: "center",
        paddingLeft: 8,
        right: 8,
        top: "35%",
        zIndex: 0,
        pointerEvents: "auto",
    }}>
        <div onClick={handleClick} role="button"
            title="Click to paste a random favorite GIF into the chat input."
            style={{
                cursor: "pointer", color: "var(--interactive-normal)", display: "flex",
            }}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 32, height: 32 }}
                onMouseDown={e => e.stopPropagation()}>
                <path
                    d="M8 8H8.01M16 8H16.01M12 12H12.01M16 16H16.01M8 16H8.01M7.2 20H16.8C17.9201 20 18.4802 20 18.908 19.782C19.2843 19.5903 19.5903 19.2843 19.782 18.908C20 18.4802 20 17.9201 20 16.8V7.2C20 6.0799 20 5.51984 19.782 5.09202C19.5903 4.71569 19.2843 4.40973 18.908 4.21799C18.4802 4 17.9201 4 16.8 4H7.2C6.0799 4 5.51984 4 5.09202 4.21799C4.71569 4.40973 4.40973 4.71569 4.21799 5.09202C4 5.51984 4 6.07989 4 7.2V16.8C4 17.9201 4 18.4802 4.21799 18.908C4.40973 19.2843 4.71569 19.5903 5.09202 19.782C5.51984 20 6.07989 20 7.2 20Z"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
        </div>
    </div>);
}
