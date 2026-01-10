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

import "./styles.css";

import { EquicordDevs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { classes } from "@utils/misc";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { useDrag, useDrop, useLayoutEffect, useRef, UserSettingsActionCreators } from "@webpack/common";

const UserSettingsDelay = findByPropsLazy("INFREQUENT_USER_ACTION");
const imgCls = findByPropsLazy("image", "imageLoading");
const dndCls = findByPropsLazy("wrapper", "target", "dragOver");

const cl = classNameFactory("vc-drag-favorite-emotes-");

type EmojiData = {
    uniqueName: string | undefined;
    id: string;
};

type EmojiDescriptor = {
    category: string;
    emoji: EmojiData;
};

export default definePlugin({
    name: "DragFavoriteEmotes",
    authors: [EquicordDevs.PWall],
    description: "Adds the ability to change the order of your favourite emotes",
    patches: [
        {
            find: "#{intl::EMOJI_FAVORITE_TOOLTIP}",
            replacement: [
                {
                    match: /(ref:\i,children:)(\(0,\i.jsx\)\(\i.\i)/,
                    replace: "$1arguments[0]?.collected?.isDragging?$self.dragItem():$2",
                },
                {
                    match: /\[(\i\.emojiItemSelected)\]/,
                    replace: '[arguments[0].collected.isDragging?"":$1]',
                },
                {
                    match: /(\[\i,\i\]=\i\.useState\(""\))/,
                    replace: "$1,[collected,drag]=$self.drag(arguments[0])",
                },
                {
                    match: /(onFocus".{0,50}\(\i,{ref:)(\i),/,
                    replace: '$1arguments[0]?.descriptor?.category==="FAVORITES"?drag:$2,collected:collected,',
                },
                {
                    match: /(,\{key:\i,ref:\i)(?=\}\),)/,
                    replace: '$1,style:{position:"relative"}',
                },
                {
                    match: /(delay:200,children:)(\i)/,
                    replace: "$1[$2,$self.wrapper(arguments[0]?.descriptor)]",
                },
                {
                    match: /(delay:200,children:.{0,100}\}\):)(\i)\)/,
                    replace: "$1[$2,$self.wrapper(arguments[0]?.descriptor)])",
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
                canDrag: () => (e?.descriptor?.category === "FAVORITES"),
                item: { id: e?.descriptor?.emoji?.uniqueName ?? e?.descriptor?.emoji?.id }
            }),
            [e?.descriptor],);
    },
    drop({ emoji, category }: EmojiDescriptor) {
        return useDrop(() => ({
            accept: "emoji",
            canDrop() {
                return category === "FAVORITES";
            },
            collect: monitor => ({
                canDrop: !!monitor.canDrop(),
                isOver: !!monitor.isOver(),
            }),
            drop(item: { id: string; }) {
                const source = item.id;
                const target = emoji?.uniqueName ?? emoji?.id;
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
                UserSettingsActionCreators.FrecencyUserSettingsActionCreators.updateAsync("favoriteEmojis", update.bind({ source, target }), UserSettingsDelay.INFREQUENT_USER_ACTION);
            }
        }), [emoji]);
    },
    dragItem() {
        return (
            <span className={classes(cl("item"), imgCls.imageLoading)} />
        );
    },
    wrapper(emoji: EmojiDescriptor) {
        const [collected, drop] = this.drop(emoji);
        const ref: React.RefObject<null | HTMLElement> = useRef(null);
        useLayoutEffect(() => {
            if (emoji?.category !== "FAVORITES") return;
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

        if (emoji?.category !== "FAVORITES") return;

        return (
            <div className={classes(cl("wrapper"), dndCls.wrapper)} aria-hidden="true">
                <div className={classes(collected.isOver ? cl("indicator") : "", dndCls.target)}
                    ref={e => {
                        ref.current = e;
                        drop(e);
                    }}>
                </div>
            </div>
        );
    }
});
