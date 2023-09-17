/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { Flex } from "@components/Flex";
import { closeModal, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize } from "@utils/modal";
import { Button, Forms, Slider, Text, useEffect, useRef, useState } from "@webpack/common";

import { handleFinishRemixing } from ".";
import EditIcon from "./Icons/EditIcon";
import EraserIcon from "./Icons/EraserIcon";
import ToolButton from "./ToolButton";

export type Tool = "paint" | "eraser" | "none";

function canvasToFile(canvas: HTMLCanvasElement, fileName: string) {
    return new Promise<File>((resolve, reject) => {
        canvas.toBlob(blob => {
            if (!blob) {
                reject("Failed to create blob");
                return;
            }
            resolve(new File([blob], `${fileName}.png`));
        });
    });
}

function RemixModal(props: ModalProps & { image: string; modalKey: string; }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [tool, setTool] = useState<Tool>("none");
    const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
    const [img, setImg] = useState<HTMLImageElement | null>(null);
    const [penSize, setPenSize] = useState(5);
    const [color, setColor] = useState("#000000");

    // Initialize Canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const container = canvas.parentElement!;

        setCtx(canvas.getContext("2d"));

        const img = new Image();
        img.src = props.image;
        img.crossOrigin = "anonymous";

        img.onload = () => {
            container.style.background = "url(" + props.image + ") center center / cover no-repeat";

            container.style.aspectRatio = `${img.width}/${img.height}`;

            // Adjust size of container to fit image
            if (img.height > img.width) {
                container.style.width = `${container.clientHeight / (img.height / img.width)}px`;
            } else if (img.width > img.height) {
                container.style.height = `${container.clientWidth / (img.width / img.height)}px`;
            } else {
                container.style.width = `${container.clientHeight}px`;
            }

            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
        };

        setImg(img);
    }, [canvasRef]);

    // On mouse down
    function mouseDown(e: MouseEvent) {
        const canvas = canvasRef.current;
        if (!canvas || !ctx) return;

        switch (tool) {
            case "eraser":
            case "paint":
                ctx.lineCap = "round";
                ctx.lineJoin = "round";

                if (tool === "eraser") {
                    ctx.globalCompositeOperation = "destination-out";
                    ctx.strokeStyle = "rgba(0, 0, 0, 1)";
                } else {
                    ctx.globalCompositeOperation = "source-over";
                    ctx.strokeStyle = color;
                }

                ctx.beginPath();
                ctx.moveTo(e.offsetX, e.offsetY);

                const onMouseMove = (e: MouseEvent) => {
                    ctx.lineTo(e.offsetX, e.offsetY);
                    ctx.stroke();
                };

                const onMouseUp = () => {
                    canvas.removeEventListener("mousemove", onMouseMove);
                    canvas.removeEventListener("mouseup", onMouseUp);
                };

                canvas.addEventListener("mousemove", onMouseMove);
                canvas.addEventListener("mouseup", onMouseUp);
                break;
            default:
                break;
        }
    }

    // Initialize mouse events
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.removeEventListener("mousedown", mouseDown);
        canvas.addEventListener("mousedown", mouseDown);
    }, [ctx, tool, color, penSize]);

    // Initialize pen color
    useEffect(() => {
        if (!ctx) return;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
    }, [color]);

    // Initialize pen size
    useEffect(() => {
        if (!ctx) return;
        ctx.lineWidth = penSize;
    }, [penSize]);

    return (
        <ModalRoot {...props} size={ModalSize.LARGE} className="remix-modal">
            <ModalHeader>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>Remix</Text>
                <ModalCloseButton onClick={() => closeModal(props.modalKey)} />
            </ModalHeader>
            <ModalContent className="remix-modal-content">
                <br />
                <div id="remix-controls">
                    <div id="remix-controls-left">
                        <ToolButton name="paint" onClick={setTool} active={tool === "paint"}>
                            <EditIcon />
                        </ToolButton>
                        <ToolButton name="eraser" onClick={setTool} active={tool === "eraser"}>
                            <EraserIcon />
                        </ToolButton>
                    </div>
                    <div id="remix-controls-right">
                        <div id="remix-pen-size">
                            <Forms.FormTitle>Pen Size</Forms.FormTitle>
                            <Slider
                                initialValue={penSize}
                                maxValue={100}
                                minValue={1}
                                markers={[1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
                                onValueChange={setPenSize}
                            />
                        </div>
                        <input type="color" value={color} onChange={e => setColor(e.target.value)} />
                    </div>
                </div>
                <br />
                <div id="remix-canvas-container">
                    <canvas id="remix-canvas" ref={canvasRef} />
                </div>
                <br />
            </ModalContent>
            <ModalFooter>
                <Flex cellSpacing={10}>
                    <Button onClick={() => closeModal(props.modalKey)} color={Button.Colors.RED}>Cancel</Button>
                    <Button onClick={async () => {
                        closeModal(props.modalKey);

                        if (!ctx || !img) return;

                        // Draw the image and pen on the canvas
                        const finalCanvas = document.createElement("canvas");
                        finalCanvas.width = img.width;
                        finalCanvas.height = img.height;

                        const finalCtx = finalCanvas.getContext("2d");
                        if (!finalCtx) return;

                        finalCtx.drawImage(img, 0, 0, img.width, img.height);
                        finalCtx.drawImage(canvasRef.current!, 0, 0, img.width, img.height);

                        handleFinishRemixing(await canvasToFile(finalCanvas, "remix"));
                    }}>Done</Button>
                </Flex>
            </ModalFooter>
        </ModalRoot>
    );
}

export default RemixModal;
