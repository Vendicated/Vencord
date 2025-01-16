/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import { useForceUpdater } from "@utils/react";
import definePlugin from "@utils/types";
import { findByCodeLazy, findComponentByCodeLazy } from "@webpack";
import { React, useRef } from "@webpack/common";

const useDrag = findByCodeLazy("useDrag::spec.begin") as typeof import("react-dnd").useDrag;
const useDrop = findByCodeLazy(/\i=\(0,\i.\i\)\(\i.options\)/) as typeof import("react-dnd").useDrop;
const AttachmentItem = findComponentByCodeLazy(/channelId:\i,draftType:\i,upload:\i,/);
const ItemType = "DND_ATTACHMENT";

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
            style={{
                display: "inline-flex",
                cursor: "grab",
                pointerEvents: "auto",
                transition: "all 0.2s",
                borderRadius: "5px",
                ...(isDragging ? {
                    opacity: 0.25
                } : {}),
                ...(isOver && isDragging ? {
                    outline: "2px solid red"
                } : {}),
                ...(isOver && !isDragging ? {
                    borderLeft: isComingFromRight.current ? "5px solid green" : "none",
                    borderRight: isComingFromLeft.current ? "5px solid green" : "none"
                } : {}),
            }}
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
