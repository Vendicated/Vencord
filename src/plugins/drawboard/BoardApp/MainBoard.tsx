/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { InfoIcon, PlusIcon } from "@components/Icons";
import { Button, ChannelStore, React, ScrollerThin, SelectedChannelStore, Tooltip, UploadHandler } from "@webpack/common";

import canvas from "./Components/Drawing/Canvas";
import CanvasOverlay from "./Components/Drawing/Elements";
import CanvasSettings from "./Components/Settings/CanvasSettings";
import Settings from "./Components/Settings/Settings";
import overlayReducer, { overlayAction, overlayState } from "./hooks/overlayReducer";
import { int2hex } from "./utils/colors";
import("./index.css");

export type tools = "select" | "add_text" | "add_image";

export type editType = { type: "text" | "image", id: number; };
export type canvasStateType = { width: number, height: number, fill?: { color: number, shouldFill: boolean; }; };

export default function MainBoard() {
    const [currentTool, setCurrentTool] = React.useState<tools>("select");
    const mainCanvasRef = React.useRef<HTMLCanvasElement>(null);
    const [overlays, dispatch] = React.useReducer(overlayReducer, []);
    const [canvasState, setCanvasState] = React.useState<canvasStateType>({ width: 512, height: 512, fill: { shouldFill: true, color: 16777215 } });
    const [currentEditing, setCurrentEditing] = React.useState<editType>();
    const CanvasComponent = canvas.loadCanvas();

    const draw = (ctx: CanvasRenderingContext2D | null | undefined) => {
        if (!ctx) return;
        ctx.canvas.width = Math.min(canvasState.width, 4096);
        ctx.canvas.height = Math.min(canvasState.height, 4096);

        if (canvasState.fill && canvasState.fill.shouldFill) {
            ctx.fillStyle = int2hex(canvasState.fill.color);
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        }
        ctx.save();
    };
    return (
        <div className="excali-parent">
            <div className="excali-container">
                <div className="excali-frame">
                    <ScrollerThin className="excali-frame-scroll" style={{ overflow: "scroll" }}>
                        <div className="excali-frame-canvas-container" style={{ width: canvasState.width, height: canvasState.height }}>
                            <CanvasComponent className="excali-frame-canvas" draw={draw} ref={mainCanvasRef} />
                            <div className="excali-frame-canvas-overlay" onClick={e => handleOverdispatch(e, currentTool, dispatch, overlays, setCurrentEditing)}>
                                {overlays && overlays.map(v => {
                                    if (v.type === "text") {
                                        return (
                                            <CanvasOverlay
                                                draw={ctx => {
                                                    const textMeasure = ctx.measureText(v.value.text);
                                                    ctx.canvas.width = textMeasure.width + textMeasure.fontBoundingBoxAscent + textMeasure.fontBoundingBoxDescent + textMeasure.actualBoundingBoxAscent;
                                                    ctx.canvas.height = textMeasure.fontBoundingBoxAscent + textMeasure.fontBoundingBoxDescent;

                                                    // ctx.font = `${v.value.style.fontSize}px ${v.value.style?.fontFamily}`;
                                                    ctx.font = v.value.style?.fontFamily;
                                                    ctx.fillStyle = "black";
                                                    ctx.fillText(v.value.text, 0, ctx.canvas.height);
                                                    ctx.save();
                                                }}
                                                key={v.id}
                                                style={{
                                                    position: "absolute",
                                                    ...v.value.style
                                                }}
                                                setTool={setCurrentTool}
                                                onClick={() => {
                                                    setCurrentEditing({ id: v.id, type: "text" });
                                                }}
                                                toDispatch={{ currentState: v, dispatch }}
                                            />

                                        );
                                    } else if (v.type === "image") {
                                        const img = new Image();
                                        img.crossOrigin = "anonymous";
                                        img.src = v.value.src;
                                        return (
                                            <CanvasOverlay
                                                draw={ctx => {
                                                    img.onload = () => {
                                                        ctx.canvas.width = img.width;
                                                        ctx.canvas.height = img.height;
                                                        ctx.drawImage(
                                                            img,
                                                            0,
                                                            0,
                                                            img.width,
                                                            img.height,
                                                            0,
                                                            0,
                                                            img.width,
                                                            img.height
                                                        );
                                                    };
                                                }}
                                                key={v.id}
                                                style={{
                                                    ...v.value.style,
                                                    position: "absolute",
                                                }}
                                                setTool={setCurrentTool}
                                                onClick={() => setCurrentEditing({ id: v.id, type: "image" })}
                                                toDispatch={{ currentState: v, dispatch }}
                                            />
                                        );
                                    }
                                })}
                            </div>
                        </div>
                    </ScrollerThin>
                </div>
                <div className="excali-config">
                    <CanvasSettings setCanvas={setCanvasState} currentState={canvasState} />
                    {
                        currentEditing && (
                            <div className="excali-config-frame">
                                <Settings editting={currentEditing} overlays={overlays} overlaydispatch={dispatch} />
                            </div>
                        )
                    }
                </div>
                <div className="excali-bar">
                    <ScrollerThin orientation="horizontal" className="excali-bar-scroll" style={{ paddingBottom: 4 }}>
                        <Tooltip text="LOLL" position="top">
                            {props => (
                                <Button size={Button.Sizes.SMALL} style={{ borderRadius: 3, height: 48 }} onClick={e => { props.onClick.call(e); setCurrentTool("add_text"); }} onMouseEnter={props.onMouseEnter} onMouseLeave={props.onMouseLeave}>
                                    <PlusIcon />
                                </Button>
                            )}
                        </Tooltip>
                        <Tooltip text="LOLL" position="top">
                            {props => (
                                <Button size={Button.Sizes.SMALL} style={{ borderRadius: 3, height: 48 }} onClick={e => { props.onClick.call(e); setCurrentTool("add_image"); }} onMouseEnter={props.onMouseEnter} onMouseLeave={props.onMouseLeave}>
                                    <PlusIcon />
                                </Button>
                            )}
                        </Tooltip>
                        <Tooltip text="LOLL" position="top">
                            {props => (
                                <Button size={Button.Sizes.SMALL} style={{ borderRadius: 3, height: 48 }} onClick={e => {
                                    props.onClick.call(e);
                                    handleCanvasMaps(mainCanvasRef.current?.getContext("2d"), overlays);
                                    mainCanvasRef.current?.getContext("2d")?.canvas.toBlob(blob => {
                                        const file = new File([blob as Blob], "idk.png", { type: "image/png" });
                                        UploadHandler.promptToUpload([file], ChannelStore.getChannel(SelectedChannelStore.getChannelId()), 0);
                                    });
                                    mainCanvasRef.current?.getContext("2d")?.reset();
                                    draw(mainCanvasRef.current?.getContext("2d")); // could somehow be better
                                }} onMouseEnter={props.onMouseEnter} onMouseLeave={props.onMouseLeave}>
                                    <InfoIcon />
                                </Button>
                            )}
                        </Tooltip>
                    </ScrollerThin>
                </div>
            </div>
        </div>
    );
}

const handleCanvasMaps = (ctx: CanvasRenderingContext2D | null | undefined, overlays: overlayState[]) => {
    if (!ctx) return;
    const { canvas } = ctx;
    const canvas_bound: DOMRect = canvas.getBoundingClientRect();

    overlays.forEach(v => {
        if (!v.node) return;
        if (!v.node.current) return;

        ctx.restore();
        const base = v.node.current.getBoundingClientRect();
        ctx.translate(base.x - canvas_bound.left, base.y - canvas_bound.top);
        ctx.drawImage(v.node.current, 0, 0, base.width, base.height, 0, 0, base.width, base.height);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.save();
    });

};

const handleOverdispatch = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, currentTool: tools, dispatch: React.Dispatch<overlayAction>, overlays: overlayState[], setCurrentEditing?: React.Dispatch<React.SetStateAction<editType | undefined>>) => {
    const element_bounding_rect = e.currentTarget.getBoundingClientRect();
    switch (currentTool) {
        case "add_text": {
            dispatch({
                type: "add",
                state: {
                    type: "text",
                    id: overlays.length,
                    value: {
                        style: {
                            top: e.clientY - element_bounding_rect.top,
                            left: e.clientX - element_bounding_rect.left,
                            color: "black",
                            fontSize: 24,
                            textAlign: "start",
                            fontFamily: "normal normal bold 30px Mononoki Nerd Font",
                        },
                        text: "Text Here"
                    }
                }
            });
            setCurrentEditing ? setCurrentEditing({ id: overlays.length, type: "text" }) : null;
            break;
        }
        case "add_image": {
            dispatch({
                type: "add",
                state: {
                    type: "image",
                    id: overlays.length,
                    value: {
                        src: "https://raw.githubusercontent.com/TheOriginalAyaka/sekai-stickers/main/public/img/emutest.png",
                        style: {
                            top: e.clientY - element_bounding_rect.y,
                            left: e.clientX - element_bounding_rect.x,
                        }
                    }
                }
            });
            break;
        }
    }
};
