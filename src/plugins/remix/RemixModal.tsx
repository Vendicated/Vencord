/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize } from "@utils/modal";
import { Button, Text } from "@webpack/common";

import { sendRemix } from ".";
import { brushCanvas, canvas, cropCanvas, ctx, exportImg, shapeCanvas } from "./editor/components/Canvas";
import { Editor } from "./editor/Editor";
import { resetBounds } from "./editor/tools/crop";
import { SendIcon } from "./icons/SendIcon";

type Props = {
    modalProps: ModalProps;
    close: () => void;
    url?: string;
};

function reset() {
    resetBounds();

    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    brushCanvas.clearRect(0, 0, canvas.width, canvas.height);
    shapeCanvas.clearRect(0, 0, canvas.width, canvas.height);
    cropCanvas.clearRect(0, 0, canvas.width, canvas.height);
}

async function closeModal(closeFunc: () => void, save?: boolean) {
    if (save) sendRemix(await exportImg());
    reset();
    closeFunc();
}

export default function RemixModal({ modalProps, close, url }: Props) {
    return (
        <ModalRoot {...modalProps} size={ModalSize.LARGE}>
            <ModalHeader>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>Remix</Text>
                <ModalCloseButton onClick={() => closeModal(close)} />
            </ModalHeader>
            <ModalContent>
                <Editor url={url} />
            </ModalContent>
            <ModalFooter className="vc-remix-modal-footer">
                <Button onClick={() => closeModal(close, true)} className="vc-remix-send"><SendIcon /> Send</Button>
                <Button onClick={() => closeModal(close)} color={Button.Colors.RED}>Close</Button>
            </ModalFooter>
        </ModalRoot>
    );
}
