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

// also sorry if the code is a bit messy i literally just learnt typescript as i went to code this idea thats been on my head for a while

import definePlugin from "@utils/types";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { useCallback, useRef, ExpressionPickerStore } from "@webpack/common";
import { insertTextIntoChatInputBox } from "@utils/discord";
import { findStore } from "@webpack";

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
                    replace: "$1 $self.renderFavButton(this, $<searchComp>);$3"
                },
                {
                    match: /(,suggestions:\i,favorites:)(\i),/,
                    replace: "$1$self.getFav($2),"
                }
            ]
        }
    ],
    instance: null,
    renderFavButton(instance) {
        this.instance = instance;
        return <GambleButton />; //theres no way walmart fucking deletes that chance picture
    },
    getFav(favorites: any[]) {
        return favorites;
    }
});

function GambleButton() {
    const containerRef = useRef(null);

    const gifs = Object.keys(findStore("UserSettingsProtoStore").frecencyWithoutFetchingLatest.favoriteGifs.gifs);

    const pickRandomGif = () => gifs[Math.floor(Math.random() * gifs.length)];

    const sendGif = async (gif: string) => {
        insertTextIntoChatInputBox(gif + " ");
        ExpressionPickerStore.closeExpressionPicker();
    };

    const handleClick = useCallback(async (e) => {
        e.stopPropagation();
        e.preventDefault();
        sendGif(pickRandomGif());
    }, []);

    return (
        <div ref={containerRef} onMouseDown={e => e.stopPropagation()} onMouseUp={e => e.stopPropagation()} style={{ position: "absolute", right: 8, top: 6, zIndex: 99999, pointerEvents: "auto" }}>
            <div onClick={handleClick} role="button" title="Click to paste a random favorite GIF into the chat input." style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, background: "var(--background-secondary)", boxShadow: "var(--elevation-medium)", cursor: "pointer", userSelect: "none" }}>
                <img
                    src="https://i5.walmartimages.com/asr/6c5de11e-499a-4e2f-9daf-1635daceb794.1b271a4bcdf6a8bead3d3c348c5ab29c.jpeg"
                    style={{ width: 32, height: 32 }}
                    draggable={false}
                    onMouseDown={e => e.stopPropagation()}
                />
            </div>
        </div>
    );
}
