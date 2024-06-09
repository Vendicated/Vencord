/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
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

import "./style.css";

import { Devs } from "@utils/constants";
import definePlugin, { StartAt } from "@utils/types";
import { findByPropsLazy, proxyLazyWebpack } from "@webpack";
import { useRef, UserSettingsActionCreators } from "@webpack/common";

const { useDrag, useDrop } = findByPropsLazy("useDrag", "useDrop");
const { useLayoutEffect } = findByPropsLazy("useLayoutEffect", "useEffect");
const imgCls = findByPropsLazy("image", "imageLoading");
const dndCls = findByPropsLazy("wrapper", "target", "dragOver");

const FrecencyUserSettingsActionCreators = proxyLazyWebpack(() => UserSettingsActionCreators.FrecencyUserSettingsActionCreators);

type EmojiData = {
    uniqueName: string | undefined;
    id: string;
};

type EmojiDescriptor = {
    category: string;
    emoji: EmojiData;
};

export default definePlugin({
    name: "DraggableEmotes",
    authors: [Devs.PWall],
    description: "Adds the ability to change the order of your favourite emotes",
    startAt: StartAt.WebpackReady,
    patches: [
        {
            find: ".EMOJI_NAMES_WITH_FAVORITED",
            replacement: [
                {
                    match: /(\("li",{\.\.\.\i,key:\i,ref:\i)}/,
                    replace: "$1,style:{position:'relative'}}",
                },
                {
                    match: /(\(0,\i\.jsx\)\(\i,{ref:.*?isFavoriteEmojiWithoutFetchingLatest\((\i)\).*?inNitroLockedSection:\i}\))/,
                    replace: "[$1,emoji.category==='FAVORITES'?$self.wrapper($2):undefined]",
                },
                {
                    match: /(\[\i,\i\]=\i\.useState\(""\))/,
                    replace: "$1,[collected,drag]=$self.drag(arguments[0]),emoji=arguments[0].descriptor",
                },
                {
                    match: /(\(\i,{ref:)(\i),/,
                    replace: "$1emoji.category==='FAVORITES'?drag:$2,collected:collected,",
                },
                {
                    match: /(function\((?:\i,?)+\){let [{a-zA-Z,:_]*,)(\.\.\.\i})/,
                    replace: "$1collected,$2",
                },
                {
                    match: /(\(0,\i.jsx\)\(\i.default)/,
                    replace: "collected.isDragging?$self.dragItem():$1",
                },
                {
                    match: /\[(\i\.emojiItemSelected)\]/,
                    replace: "[collected.isDragging?'':$1]",
                },
            ],
        },
    ],
    drag(e: { descriptor: EmojiDescriptor; }) {
        return useDrag(
            () => ({
                type: "emoji",
                collect: monitor => ({
                    isDragging: !!monitor.isDragging(),
                }),
                canDrag: () => (e.descriptor.category === "FAVORITES"),
                item: { id: e.descriptor.emoji.uniqueName ?? e.descriptor.emoji.id }
            }),
            [e.descriptor],);
    },
    drop(emoji: EmojiData) {
        return useDrop(() => ({
            accept: "emoji",
            collect: monitor => ({
                canDrop: !!monitor.canDrop(),
                isOver: !!monitor.isOver(),
            }),
            drop(item: { id: string; }) {
                const source = item.id;
                const target = emoji.uniqueName ?? emoji.id;
                function update(this: { source: string; target: string; }, e: { emojis: string[]; }) {
                    if (this.source === this.target) {
                        return false;
                    }
                    const sourceIndex = e.emojis.findIndex(emoji => emoji === this.source);
                    const targetIndex = e.emojis.findIndex(emoji => emoji === this.target);
                    // Adjust final index to account for removal of source emoji
                    const finalIndex = targetIndex < sourceIndex ? targetIndex : targetIndex - 1;
                    if (sourceIndex === finalIndex) {
                        return false;
                    }
                    e.emojis.splice(sourceIndex, 1);
                    e.emojis.splice(finalIndex, 0, this.source);
                }
                FrecencyUserSettingsActionCreators.updateAsync("favoriteEmojis", update.bind({ source, target }));
            }
        }), [emoji]);
    },
    dragItem() {
        return (
            <span className={imgCls.imageLoading} style={{ backgroundSize: "40px", height: "40px", width: "40px", display: "block" }} />
        );
    },
    wrapper(emoji: EmojiData) {
        const [collected, drop] = this.drop(emoji);
        const ref: React.MutableRefObject<null | HTMLElement> = useRef(null);
        useLayoutEffect(() => {
            const frame = requestAnimationFrame(() => {
                if (!ref.current) {
                    return;
                }
                if (collected.canDrop) {
                    ref.current.classList.add(dndCls.autoPointerEvents);
                    return;
                }
                ref.current.classList.remove(dndCls.autoPointerEvents);
            }
            );
            return () => cancelAnimationFrame(frame);
        }, [collected, ref]);
        return (
            <div className={`${dndCls.wrapper} vc-dragging-wrapper`} aria-hidden="true">
                <div className={`${dndCls.target} ${collected.isOver ? "vc-dragging-indicator" : ""}`}
                    ref={e => {
                        ref.current = e;
                        drop(e);
                    }}>
                </div>
            </div>
        );
    }
});

