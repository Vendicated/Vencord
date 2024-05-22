/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { closeModal, ModalCloseButton, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Button, Flex, Text, useRef, useState } from "@webpack/common";

import type { ColorPicker } from "../types";

interface ColorPickerModalProps {
    modalProps: ModalProps;
    ColorPicker: ColorPicker;
    onClose: () => void;
    onSubmit: (v: number) => void;
    initialColor: number;
    suggestedColors: string[];
}

export function ColorPickerModal({ modalProps, ColorPicker, onClose, onSubmit, initialColor = 0, suggestedColors = [] }: ColorPickerModalProps) {
    const [color, setColor] = useState(initialColor);
    const [pos, setPos] = useState<[number, number]>([-1, -1]);
    const header = useRef<HTMLDivElement>(null);

    return (
        <div
            style={{
                position: pos[0] === -1 || pos[1] === -1 ? "revert" : "fixed",
                left: `clamp(0px, ${pos[0]}px, calc(100vw - ${header.current?.getBoundingClientRect().width ?? 0}px))`,
                top: `clamp(22px, ${pos[1]}px, calc(100vh - ${header.current?.getBoundingClientRect().height ?? 0}px))`
            }}
        >
            <ModalRoot {...modalProps} size={ModalSize.DYNAMIC}>
                <style>{":has(>:not([class*=hidden__]) [class*=customColorPicker__])>[class*=backdrop__]{display:none!important}[class*=root_] [class*=customColorPicker__]{border:none!important;box-shadow:none!important}"}</style>
                <div
                    ref={header}
                    style={{ cursor: "move" }}
                    onMouseDown={e => {
                        const ref = header.current;
                        if (ref === null) return;
                        const rect = ref.getBoundingClientRect();
                        const offsetX = e.pageX - rect.left;
                        const offsetY = e.pageY - rect.top;
                        const onDrag = (e: MouseEvent) => setPos([e.pageX - offsetX, e.pageY - offsetY]);
                        document.addEventListener("mousemove", onDrag);
                        document.addEventListener("mouseup",
                            () => { document.removeEventListener("mousemove", onDrag); },
                            { once: true }
                        );
                    }}
                >
                    <ModalHeader justify={Flex.Justify.BETWEEN}>
                        <Text color="header-primary" variant="heading-lg/semibold" tag="h1">
                            Color Picker
                        </Text>
                        <div onMouseDown={e => e.stopPropagation()}>
                            <ModalCloseButton onClick={onClose} />
                        </div>
                    </ModalHeader>
                </div>
                <ColorPicker
                    value={color}
                    showEyeDropper={true}
                    suggestedColors={suggestedColors}
                    onChange={(e: number) => setColor(e)}
                />
                <ModalFooter>
                    <Button onClick={() => onSubmit(color)}>
                        Apply
                    </Button>
                </ModalFooter>
            </ModalRoot>
        </div>
    );
}

export function openColorPickerModal(
    ColorPicker: ColorPicker,
    onSubmit: (v: number) => void,
    initialColor: number = 0,
    suggestedColors: string[] = []
) {
    const key = openModal(modalProps =>
        <ColorPickerModal
            modalProps={modalProps}
            ColorPicker={ColorPicker}
            onClose={() => closeModal(key)}
            onSubmit={onSubmit}
            initialColor={initialColor}
            suggestedColors={suggestedColors}
        />
    );
    return key;
}
