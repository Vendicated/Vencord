/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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
 * along with this program.  If not, see <https://www.gnu.org/licenses/>
 */

import { closeModal, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Button, Text, useRef, useState } from "@webpack/common";

interface ColorPickerModalProps {
    modalProps: ModalProps,
    onClose: () => void,
    onSubmit: (v: number) => void,
    initialColor: number
}

export function ColorPickerModal({ modalProps, onClose, onSubmit, initialColor = 0 }: ColorPickerModalProps): JSX.Element {
    const RGBtoHSV = (r: number, g: number, b: number): [number, number, number] => {
        r /= 255;
        g /= 255;
        b /= 255;
        const xmax: number = Math.max(r, g, b);
        const xmin: number = Math.min(r, g, b);
        const chroma: number  = xmax - xmin;
        const v: number  = xmax;
        let h: number  = 0;
        let s: number  = 0;
        if (chroma > 0) {
            if (xmax === r) h = (g - b) / chroma;
            if (xmax === g) h = (b - r) / chroma + 2;
            if (xmax === b) h = (r - g) / chroma + 4;
            if (xmax > 0) s = chroma / xmax;
        }
        h *= 60;
        return [h < 0 ? h + 360 : h, s, v];
    }

    const HSVtoRGB = (h: number, s: number, v: number): [number, number, number] => {
        let chroma = s * v;
        const hueBy60 = h / 60;
        const m = v - chroma;
        const x = chroma * (1 - Math.abs(hueBy60 % 2 - 1)) + m;
        chroma += m;
        const index = Math.trunc(hueBy60) % 6;
        return [
            Math.round([chroma, x, m, m, x, chroma][index] * 255),
            Math.round([x, chroma, chroma, x, m, m][index] * 255),
            Math.round([m, m, x, chroma, chroma, x][index] * 255)
        ];
    }

    const RGBto24BitColor = (r: number, g: number, b: number): number => {
        return r * 65_536 + g * 256 + b;
    }

    const _24BitColorToRGB = (c: number): [number, number, number] => {
        return [Math.trunc(c / 65_536), Math.trunc(c % 65_536 / 256), c % 65_536 % 256];
    }

    const updateColor = (newSliderPos: number, newMarkerPos: [number, number]): void => {
        const newColor: number = RGBto24BitColor(...HSVtoRGB(newSliderPos * 360, newMarkerPos[0], 1 - newMarkerPos[1]));
        setColor(newColor);
        setInputColor(newColor.toString(16).padStart(6, "0"));
    }

    const startDrag = (onMouseMoveFunc: (e: MouseEvent) => void): void => {
        document.addEventListener("mousemove", onMouseMoveFunc);
        document.addEventListener("mouseup",
            () => {document.removeEventListener("mousemove", onMouseMoveFunc)},
            { once: true }
        );
    }

    const colorAreaRef = useRef<HTMLDivElement>(null);
    const sliderBarRef = useRef<HTMLDivElement>(null);
    const [color, setColor] = useState(initialColor);
    const [markerPos, setMarkerPos] = useState(((): [number, number] => {
        const hsv: [number, number, number] = RGBtoHSV(..._24BitColorToRGB(initialColor));
        return [hsv[1], 1 - hsv[2]];
    })());
    const [sliderPos, setSliderPos] = useState(RGBtoHSV(..._24BitColorToRGB(initialColor))[0] / 360);
    const [inputColor, setInputColor] = useState(initialColor.toString(16).padStart(6, "0"));

    return (
        <ModalRoot {...modalProps} size={ModalSize.DYNAMIC}>
            <ModalHeader>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        width: "100%"
                    }}
                >
                    <Text style={{color: "var(--header-primary)", fontSize: "20px", fontWeight: "600"}}>
                        {"Color Picker"}
                    </Text>
                    <ModalCloseButton onClick={onClose} />
                </div>
            </ModalHeader>
            <ModalContent>
                <div style={{width: "220px", padding: "16px"}}>
                    <div
                        ref={colorAreaRef}
                        style={{
                            background: "linear-gradient(0, #000, #0000), linear-gradient(90deg, #fff, #fff0), hsl(" + sliderPos * 360 + " 100% 50%)",
                            borderRadius: "3px",
                            cursor: "crosshair",
                            height: "150px",
                            position: "relative"
                        }}
                        onMouseDown={(e: React.MouseEvent): void => {
                            const ref: HTMLDivElement | null = colorAreaRef.current;
                            if (ref !== null) {
                                const rect = ref.getBoundingClientRect();
                                const newMarkerPos: [number, number] = [(e.pageX - rect.left) / rect.width, (e.pageY - rect.top) / rect.height];
                                setMarkerPos(newMarkerPos);
                                updateColor(sliderPos, newMarkerPos);
                                const onMouseMoveFunc = (e: MouseEvent): void => {
                                    const newMarkerPos: [number, number] = [
                                        e.pageX < rect.left ? 0 : e.pageX > rect.right ? 1 : (e.pageX - rect.left) / rect.width,
                                        e.pageY < rect.top ? 0 : e.pageY > rect.bottom ? 1 : (e.pageY - rect.top) / rect.height
                                    ];
                                    setMarkerPos(newMarkerPos);
                                    updateColor(sliderPos, newMarkerPos);
                                }
                                startDrag(onMouseMoveFunc);
                            }
                        }}
                    >
                        <div
                            style={{
                                borderRadius: "50%",
                                boxShadow: "0px 0px 0px 1.5px #fff, inset 0px 0px 1px 1px #0000004d, 0px 0px 1px 2px #0006",
                                width: "4px",
                                height: "4px",
                                position: "absolute",
                                left: "calc(" + markerPos[0] * 100 + "% - 2px)",
                                top: "calc(" + markerPos[1] * 100 + "% - 2px)"
                            }}
                        />
                    </div>
                    <div
                        ref={sliderBarRef}
                        style={{
                            background: "linear-gradient(90deg, #f00, #ff0 calc(100% / 6), #0f0 calc(100% / 3), #0ff 50%, #00f calc(200% / 3), #f0f calc(500% / 6), #f00)",
                            cursor: "crosshair",
                            borderRadius: "3px",
                            height: "8px",
                            margin: "8px 0",
                            position: "relative"
                        }}
                        onMouseDown={(e: React.MouseEvent): void => {
                            const ref: HTMLDivElement | null = sliderBarRef.current;
                            if (ref !== null) {
                                const rect: DOMRect = ref.getBoundingClientRect();
                                const newSliderPos: number = (e.pageX - rect.left) / rect.width;
                                setSliderPos(newSliderPos);
                                updateColor(newSliderPos, markerPos);
                                const onMouseMoveFunc = (e: MouseEvent): void => {
                                    const newSliderPos: number = e.pageX < rect.left ? 0 : e.pageX > rect.right ? 1 : (e.pageX - rect.left) / rect.width;
                                    setSliderPos(newSliderPos);
                                    updateColor(newSliderPos, markerPos);
                                }
                                startDrag(onMouseMoveFunc);
                            }
                        }}
                    >
                        <div
                            style={{
                                background: "#fff",
                                borderRadius: "3px",
                                cursor: "ew-resize",
                                width: "8px",
                                height: "16px",
                                marginTop: "-3px",
                                position: "absolute",
                                left: "calc(" + sliderPos * 100 + "% - 2px)"
                            }}
                        />
                    </div>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            marginTop: "16px"
                        }}
                    >
                        <div
                            style={{
                                background: "#" + color.toString(16).padStart(6, "0"),
                                border: "1px solid var(--primary-400)",
                                borderRadius: "4px",
                                width: "32px",
                                height: "32px"
                            }}
                        />
                        <input
                            maxLength={7}
                            value={"#" + inputColor}
                            style={{
                                background: "var(--input-background)",
                                border: "none",
                                borderRadius: "3px",
                                boxSizing: "border-box",
                                color: "var(--text-normal)",
                                fontSize: "16px",
                                width: "calc(100% - 50px)",
                                height: "40px",
                                padding: "10px"
                            }}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                                const colorStr: string = e.target.value.substring(1);
                                setInputColor(colorStr);
                                let r: number = 0;
                                let g: number = 0;
                                let b: number = 0;
                                if (colorStr.length === 3) {
                                    r = parseInt("" + colorStr[0] + colorStr[0], 16);
                                    g = parseInt("" + colorStr[1] + colorStr[1], 16);
                                    b = parseInt("" + colorStr[2] + colorStr[2], 16);
                                } else if (colorStr.length === 6) {
                                    r = parseInt(colorStr.slice(0, 2), 16);
                                    g = parseInt(colorStr.slice(2, 4), 16);
                                    b = parseInt(colorStr.slice(4, 6), 16);
                                } else return;
                                if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
                                    setColor(RGBto24BitColor(r, g, b));
                                    const hsv: [number, number, number] = RGBtoHSV(r, g, b);
                                    setSliderPos(hsv[0] / 360);
                                    setMarkerPos([hsv[1], 1 - hsv[2]]);
                                }
                            }}
                        />
                    </div>
                </div>
            </ModalContent>
            <ModalFooter>
                <Button
                    color={Button.Colors.PRIMARY}
                    size={Button.Sizes.MEDIUM}
                    onClick={() => {onSubmit(color)}}
                >
                    {"Apply"}
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
}

export function openColorPickerModal(onSubmit: (v: number) => void, initialColor: number = 0): void {
    const key = openModal(modalProps =>
        <ColorPickerModal
            modalProps={modalProps}
            onClose={() => {closeModal(key)}}
            onSubmit={onSubmit}
            initialColor={initialColor}
        />
    );
};
