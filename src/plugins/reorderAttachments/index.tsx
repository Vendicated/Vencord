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

const DraggableList = ({ channelId, draftType, keyboardModeEnabled, size, attachments, ignoredFilename }) => {
    const forceUpdate = useForceUpdater();

    // discord filters the attachments before rendering them, but we need the original unfiltered attachments
    // to edit the upload order so we remove the ignored files here while retaining the array reference
    for (let i = attachments.length - 1; i >= 0; i--) {
        if (attachments[i].filename === ignoredFilename) {
            attachments.splice(i, 1);
        }
    }

    const moveItem = (from, to) => {
        if (from === to || from < 0 || to < 0 || from >= attachments.length || to >= attachments.length) return;
        attachments.splice(to, 0, ...attachments.splice(from, 1));
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
                size={size}
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
                    match: /:(\i).map\(\i=>.*?(channelId:\i,.*?\i\.\i\.MEDIUM)},\i\.id\)\)(?<=\1=(\i).filter\(\i=>\i.filename!==(\i)\).{0,500})/,
                    replace: ":$self.DraggableList({$2,attachments:$3,ignoredFilename:$4})"
                }
            ]
        },
        { // make the img in AttachmentItem not draggable so it doesn't try to add it as a new attachment
            find: '"video/quicktime","video/mp4"];',
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
