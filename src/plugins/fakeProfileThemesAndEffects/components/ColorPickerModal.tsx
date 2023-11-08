/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { closeModal, ModalCloseButton, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Button, Text, useRef, useState } from "@webpack/common";

interface ColorPickerModalProps {
    modalProps: ModalProps;
    ColorPicker: any;
    onClose: () => void;
    onSubmit: (v: number) => void;
    initialColor: number;
    suggestedColors: Array<string>;
}

export function ColorPickerModal({ modalProps, ColorPicker, onClose, onSubmit, initialColor = 0, suggestedColors = [] }: ColorPickerModalProps): JSX.Element {
    const headerRef = useRef<HTMLDivElement>(null);
    const [color, setColor] = useState(initialColor);
    const [pos, setPos] = useState([-1, -1]);

    return (
        <div
            style={{
                position: pos[0] === -1 || pos[1] === -1 ? "revert" : "fixed",
                left: "clamp(0px, " + pos[0] + "px, calc(100vw - " + (() => {
                    const ref: HTMLDivElement | null = headerRef.current;
                    if (ref !== null) return ref.getBoundingClientRect().width;
                })() + "px))",
                top: "clamp(22px, " + pos[1] + "px, calc(100vh - " + (() => {
                    const ref: HTMLDivElement | null = headerRef.current;
                    if (ref !== null) return ref.getBoundingClientRect().height;
                })() + "px))"
            }}
        >
            <ModalRoot {...modalProps} size={ModalSize.DYNAMIC}>
                <style>{":has([class*=customColorPicker__])>[class*=backdrop__]{opacity:0!important}[class*=root_] [class*=customColorPicker__]{border:none!important;box-shadow:none!important}"}</style>
                <div
                    ref={headerRef}
                    onMouseDown={(e: React.MouseEvent) => {
                        const ref: HTMLDivElement | null = headerRef.current;
                        if (ref === null) return;
                        const rect: DOMRect = ref.getBoundingClientRect();
                        const offsetX: number = e.pageX - rect.left;
                        const offsetY: number = e.pageY - rect.top;
                        const onDrag = (e: MouseEvent) => { setPos([e.pageX - offsetX, e.pageY - offsetY]); };
                        document.addEventListener("mousemove", onDrag);
                        document.addEventListener("mouseup",
                            (): void => { document.removeEventListener("mousemove", onDrag); },
                            { once: true }
                        );
                    }}
                >
                    <ModalHeader>
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                width: "100%",
                            }}
                        >
                            <Text style={{ color: "var(--header-primary)", fontSize: "20px", fontWeight: "600" }}>
                                {"Color Picker"}
                            </Text>
                            <div onMouseDown={(e: React.MouseEvent) => { e.stopPropagation(); }}>
                                <ModalCloseButton onClick={onClose} />
                            </div>
                        </div>
                    </ModalHeader>
                </div>
                <ColorPicker
                    value={color}
                    showEyeDropper={true}
                    suggestedColors={suggestedColors}
                    onChange={(e: number) => { setColor(e); }}
                />
                <ModalFooter>
                    <Button
                        color={Button.Colors.PRIMARY}
                        size={Button.Sizes.MEDIUM}
                        onClick={() => { onSubmit(color); }}
                    >
                        {"Apply"}
                    </Button>
                </ModalFooter>
            </ModalRoot>
        </div>
    );
}

export function openColorPickerModal(ColorPicker: any, onSubmit: (v: number) => void, initialColor: number = 0, suggestedColors: Array<string> = []): void {
    const key = openModal(modalProps =>
        <ColorPickerModal
            modalProps={modalProps}
            ColorPicker={ColorPicker}
            onClose={() => { closeModal(key); }}
            onSubmit={onSubmit}
            initialColor={initialColor}
            suggestedColors={suggestedColors}
        />
    );
}
