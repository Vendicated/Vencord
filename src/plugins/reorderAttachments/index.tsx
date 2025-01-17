/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { classNameFactory } from "@api/Styles";
import { Devs } from "@utils/constants";
import { classes } from "@utils/misc";
import { useForceUpdater } from "@utils/react";
import definePlugin from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import { React, useDrag, useDrop, useRef } from "@webpack/common";

const AttachmentItem = findComponentByCodeLazy(/channelId:\i,draftType:\i,upload:\i,/);
const ItemType = "DND_ATTACHMENT";
const cl = classNameFactory("vc-drag-att-");

const DraggableItem = ({ uploadItem, index, moveItem, children }) => {
    const [{ isDragging }, drag] = useDrag({
        type: ItemType,
        item: { index },
        collect: monitor => ({ isDragging: monitor.isDragging() })
    });

    const isComingFromRight = useRef(false);
    const isComingFromLeft = useRef(false);

    const [{ isOver }, drop] = useDrop({
        accept: ItemType,
        collect: monitor => ({
            isOver: monitor.isOver()
        }),
        hover: (draggedItem: any) => {
            isComingFromRight.current = index < draggedItem.index;
            isComingFromLeft.current = index > draggedItem.index;
        },
        drop: (draggedItem: any) => {
            moveItem(draggedItem.index, index);
        }
    });

    return (
        <div
            key={uploadItem.id}
            ref={node => {
                drag(drop(node));
            }}
            className={
                classes(
                    cl("item"),
                    isDragging && cl("dragging"),
                    isOver && cl("drop-target"),
                    isOver && isComingFromRight.current && cl("drop-from-right"),
                    isOver && isComingFromLeft.current && cl("drop-from-left")
                )
            }
        >
            {children}
        </div>
    );
};

const DraggableList = ({ attachments, channelId, draftType, keyboardModeEnabled }) => {
    const forceUpdate = useForceUpdater();

    const moveItem = (from, to) => {
        const [movedItem] = attachments.splice(from, 1);
        attachments.splice(to, 0, movedItem);
        forceUpdate();
    };

    return attachments.map((uploadItem, index) => (
        <DraggableItem
            key={uploadItem.id}
            uploadItem={uploadItem}
            index={index}
            moveItem={moveItem}
        >
            <AttachmentItem
                channelId={channelId}
                upload={uploadItem}
                draftType={draftType}
                keyboardModeEnabled={keyboardModeEnabled}
                clip={uploadItem.clip}
            />
        </DraggableItem>
    ));
};

export default definePlugin({
    name: "ReorderAttachments",
    description: "Allows you to reorder attachments before sending them",
    authors: [Devs.Suffocate],
    patches: [
        {
            find: ')("attachments",',
            replacement: [
                {
                    match: /:(\i).map\(\i=>.*?(channelId:\i),(draftType:.*?),(keyboardModeEnabled:\i),.*?\.id\)\)/,
                    replace: ":$self.DraggableList({attachments:$1,$2,$3,$4})"
                }
            ]
        },
        { // make the img in AttachmentItem not draggable so it doesn't try to add it as a new attachment
            find: '["image/jpeg",',
            replacement: [
                {
                    match: /"img",{src:\i,/,
                    replace: "$&draggable:false,"
                }
            ]
        }
    ],
    DraggableList
});
