/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { React, useRef, useState } from "@webpack/common";

export default definePlugin({
    name: "ReorderAttachments",
    description: "Allows you to reorder attachments before sending them",
    authors: [Devs.Suffocate],
    patches: [
        {
            find: ')("attachments",',
            group: true,
            replacement: [
                {
                    match: /return\(0,\i.jsx\)\("ul",\{(?=.*?:(\i).map\()/,
                    replace: "let dragAndDropVars = $self.dragAndDropVars($1);$&"
                },
                {
                    match: /(:\i.map\()(\i)=>(.*?\.id\))\)/,
                    replace: "$1($2,index)=>$self.wrapAttachmentItem($2,index,$3,dragAndDropVars))"
                }
            ]
        }
    ],

    dragAndDropVars: items => {
        const heldItem = useRef<any>(null);
        const [_, setList] = useState(items);

        const moveHeldItemTo = to => {
            if (!heldItem.current || heldItem.current.currentIndex === to) return;
            const item = items.splice(heldItem.current.currentIndex, 1)[0];
            items.splice(to, 0, item);
            heldItem.current.currentIndex = to;
            setList([...items]);
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (heldItem.current?.held && e.buttons !== 1) {
                heldItem.current.outsideDropArea = true;
                handleDrop();
            }
        };

        const handleDragStart = (e, index) => {
            e.dataTransfer.setData("text/plain", ""); // some data is required for drag and drop to work

            items.forEach(item => {
                item.held = false;
                item.outsideDropArea = false;
                item.preDragIndex = undefined;
            });

            const held = items[index];
            held.held = true;
            held.preDragIndex = index;
            held.currentIndex = index;
            heldItem.current = held;

            // was the best way I could find to globally detect if the user dropped the item outside the drop area
            window.addEventListener("mousemove", handleMouseMove);
        };

        const handleDragOver = (e, index) => {
            e.stopPropagation();
            e.preventDefault();

            if (heldItem.current) {
                heldItem.current.outsideDropArea = false;
                moveHeldItemTo(index);
            }
        };

        const handleDrop = () => {
            // we've already been changing the index on drag over, so we just need to reset the held state
            if (heldItem.current) {
                if (heldItem.current?.outsideDropArea) {
                    moveHeldItemTo(heldItem.current.preDragIndex);
                }

                heldItem.current.held = false;
                heldItem.current.outsideDropArea = false;
                heldItem.current.preDragIndex = undefined;
            }

            setList([...items]);
            heldItem.current = null;

            window.removeEventListener("mousemove", handleMouseMove);
        };

        return { handleDragStart, handleDragOver, handleDrop };
    },

    wrapAttachmentItem: (uploadItem, index, original, dragAndDropVars) => {
        const { handleDragStart, handleDragOver, handleDrop } = dragAndDropVars;
        return (
            <div
                style={{
                    display: "inline-flex",
                    cursor: "grab",
                    ...(uploadItem?.held ? {
                        opacity: "50%",
                        outline: "2px solid #7289da",
                        borderRadius: "5px"
                    } : {})
                }}
                onDragStart={e => handleDragStart(e, index)}
                onDragOver={e => handleDragOver(e, index)}
                onDrop={handleDrop}
                onDragEnd={handleDrop}
                draggable={true}>
                {original}
            </div>
        );
    }
});
