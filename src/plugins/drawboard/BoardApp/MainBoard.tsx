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

import getCanvass from "./Components/Drawing/Canvas";
import CanvasText from "./Components/Drawing/CanvasText";
import getImageOverlay from "./Components/Drawing/Image";
import CanvasSettings from "./Components/Settings/CanvasSettings";
import Settings from "./Components/Settings/Settings";
import overlayReducer, { overlayAction, overlayState } from "./hooks/overlayStore";
import("./index.css");

export type tools = "select" | "add_text" | "add_image";

type editType = { type: "text" | "image", id: number; };
export type canvasStateType = { width: number, height: number, fill?: { color: string, shouldFill: boolean; }; };


export default function MainBoard() {
    const [currentTool, setCurrentTool] = React.useState<tools>("select");
    const mainCanvasRef = React.useRef<HTMLCanvasElement>(null);
    const [overlays, dispatch] = React.useReducer(overlayReducer, []);
    const [canvasState, setCanvasState] = React.useState<canvasStateType>({ width: 512, height: 512, fill: { shouldFill: true, color: "white" } });
    const [currentEditing, setCurrentEditing] = React.useState<editType>();
    const CanvasComponent = getCanvass();
    const ImageOverlay = getImageOverlay();

    const [canvasSource, setCanvasSource] = React.useState();

    const draw = (ctx: CanvasRenderingContext2D) => {
        ctx.canvas.width = Math.min(canvasState.width, 4096);
        ctx.canvas.height = Math.min(canvasState.height, 4096);

        if (canvasState.fill && canvasState.fill.shouldFill) {
            ctx.fillStyle = canvasState.fill.color;
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
                            <div className="excali-frame-canvas-overlay" onClick={e => handleOverdispatch(e, currentTool, dispatch, overlays)}>
                                {overlays && overlays.map(v => {
                                    if (v.type === "text") {
                                        return (
                                            <CanvasText
                                                draw={ctx => {
                                                    const textMeasure = ctx.measureText(v.value.text);
                                                    console.log(textMeasure);
                                                    ctx.canvas.width = textMeasure.width + textMeasure.fontBoundingBoxAscent + textMeasure.fontBoundingBoxDescent + textMeasure.actualBoundingBoxAscent;
                                                    ctx.canvas.height = textMeasure.fontBoundingBoxAscent + textMeasure.fontBoundingBoxDescent;

                                                    ctx.font = `${v.value.style.fontSize}px ${v.value.style?.fontFamily}`;
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
                                                toDispatch={{ currentState: v, id: v.id, dispatch }}
                                            />

                                        );
                                    }
                                })}
                            </div>
                        </div>
                    </ScrollerThin>
                </div>
                <div className="excali-config">
                    <CanvasSettings setGlobal={setCanvasState} currentState={canvasState} />
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
                                <Button size={Button.Sizes.SMALL} style={{ borderRadius: 3, height: 48 }} onClick={e => {
                                    props.onClick.call(e);
                                    handleCanvasMaps(mainCanvasRef.current?.getContext("2d"), overlays);
                                    mainCanvasRef.current?.getContext("2d")?.canvas.toBlob(blob => {
                                        const file = new File([blob as Blob], "idk.png", { type: "image/png" });
                                        UploadHandler.promptToUpload([file], ChannelStore.getChannel(SelectedChannelStore.getChannelId()), 0);
                                    });
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
    // return (
    //     <div style={{ width: "100%" }}>
    //         <button onClick={() => { setCurrentTool("add_text"); }}>LOLR</button>
    //         <button onClick={() => setCurrentTool("add_image")}>img</button>
    //         <button onClick={() => {
    //             overlays && overlays.forEach((v, i) => {
    //                 if (v.type === "text" && i !== 0) {
    //                     dispatch({ type: "swapIndex", id: v.id, swapToIndex: 0 });
    //                 }
    //             });
    //         }}>move text top</button>
    //         <button onClick={() => {
    //             overlays && overlays.forEach((v, i) => {
    //                 if (v.type === "image" && i !== 0) {
    //                     dispatch({ type: "swapIndex", id: v.id, swapToIndex: 0 });
    //                 }
    //             });
    //         }}>move image top</button>
    //         <button onClick={() => { console.log(overlays); }}>print</button>

    //         <button onClick={() => {
    //             if (!mainCanvasRef.current) return;
    //             const canvas: CanvasRenderingContext2D = mainCanvasRef.current.getContext("2d");
    //             const canvas_bound = canvas?.canvas.getBoundingClientRect();
    //             canvas?.clearRect(0, 0, canvas?.canvas.width, canvas?.canvas.height);
    //             overlays.forEach((v, i) => {
    //                 if (!v.node) return;
    //                 const base = v.node.getBoundingClientRect();

    //                 if (v.type === "text") {
    //                     canvas.font = `${v.defaultVal.style?.fontSize}px ${v.defaultVal.style?.fontFamily}`;
    //                     canvas.textRendering = "geometricPrecision";
    //                     canvas.textBaseline = "middle";
    //                     const { node } = v;

    //                     if (!node) return "lllr";
    //                     const plit = node.value.split("\n");
    //                     let uhhhHeight = v.defaultVal.style.fontSize;
    //                     plit.forEach((v1, i) => {
    //                         canvas.translate(base?.x - canvas_bound?.left, base?.y - canvas_bound?.top);
    //                         canvas?.fillText(v1, 0, uhhhHeight);
    //                         canvas.setTransform(1, 0, 0, 1, 0, 0);
    //                         canvas.save();
    //                         uhhhHeight += v.defaultVal.style?.fontSize;
    //                     });
    //                 } else if (v.type === "image") {
    //                     const { node } = v;
    //                     const hRatio = canvas?.canvas.width / node.width;
    //                     const vRatio = canvas?.canvas.height / node.height;

    //                     canvas?.translate(base?.x - canvas_bound?.left, base?.y - canvas_bound?.top);
    //                     canvas?.drawImage(
    //                         node,
    //                         0,
    //                         0,
    //                         node.width,
    //                         node.height,
    //                         0,
    //                         0,
    //                         node.width,
    //                         node.height
    //                     );
    //                     canvas.setTransform(1, 0, 0, 1, 0, 0);
    //                 }
    //             });

    //             setCanvasSource(canvas?.canvas.toDataURL());
    //         }}>generate image for fun</button>
    //         <button onClick={() => { mainCanvasRef.current?.getContext("2d")?.clearRect(0, 0, mainCanvasRef.current.width, mainCanvasRef.current.height); dispatch({ type: "clear" }); }}>clear rec</button>

    //         <div className="idkwhattonamethis_container" style={{ position: "absolute", width: "100%", height: "100%", overflow: "hidden" }}>
    //             <CanvasComponent
    //                 key={"CANVAS"}
    //                 ref={mainCanvasRef}
    //                 draw={draw}
    //                 style={{ position: "absolute" }}
    //                 className="idkwhattonamethis_canvas"
    //             />
    //             <div
    //                 className="idkwhattonamethis_overlay"
    //                 style={{
    //                     position: "absolute",
    //                     width: 1024, height: 1024, overflow: "hidden", border: "2px solid black"
    //                 }}
    //                 onClick={e => handleOverdispatch(e, currentTool, dispatch, overlays)}
    //             >
    //                 {
    //                     overlays && overlays.map(v => {
    //                         if (v.type === "text") {
    //                             return (
    //                                 <CanvasText
    //                                     parentcanvas={mainCanvasRef}
    //                                     ref={node => {
    //                                         if (node && !v.node) {
    //                                             dispatch({ type: "update", id: v.id, state: { ...v, node } });
    //                                         }
    //                                     }}
    //                                     key={v.id}
    //                                     style={{
    //                                         ...v.defaultVal.style
    //                                     }}
    //                                     setTool={setCurrentTool}
    //                                     onClick={() => {
    //                                         setCurrentEditing({ id: v.id, type: "text" });
    //                                     }}
    //                                 />
    //                             );
    //                         } else if (v.type === "image") {
    //                             const imggr = new Image();
    //                             imggr.src = v.defaultVal.src;
    //                             return (
    //                                 <ImageOverlay
    //                                     src={v.defaultVal.src}
    //                                     parentcanvas={mainCanvasRef}
    //                                     ref={node => {
    //                                         if (node && !v.node) {
    //                                             dispatch({ type: "update", id: v.id, state: { ...v, node, defaultVal: { ...v.defaultVal, style: { height: imggr.height, width: imggr.width, ...v.defaultVal.style } } } });
    //                                         }
    //                                     }}
    //                                     key={v.id}
    //                                     setTool={setCurrentTool}
    //                                     style={{
    //                                         ...v.defaultVal.style
    //                                     }}
    //                                 />
    //                             );
    //                         }
    //                     })
    //                 }
    //             </div>
    //             {/* <img width={mainCanvasRef.current?.getContext("2d")?.canvas.width} height={mainCanvasRef.current?.getContext("2d")?.canvas.height} src={canvasSource} style={{ border: "2px black solid", position: "absolute", left: 600 }} /> */}
    //         </div>

    //     </div >
    // );
}

const handleCanvasMaps = (ctx: CanvasRenderingContext2D | null | undefined, overlays: overlayState[]) => {
    if (!ctx) return;
    const { canvas } = ctx;
    const canvas_bound: DOMRect = canvas.getBoundingClientRect();

    overlays.forEach(v => {
        if (v.type === "text") {
            if (!v.node) return;
            if (!v.node.current) return;

            ctx.restore();
            const base = v.node.current.getBoundingClientRect();
            ctx.translate(base?.x - canvas_bound.left, base?.y - canvas_bound.top);
            ctx.drawImage(v.node.current, 0, 0, base.width, base.height, 0, 0, base.width, base.height);
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.save();
        }
    });

};


const handleOverdispatch = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, currentTool: tools, dispatch: React.Dispatch<overlayAction>, overlays: overlayState[]) => {
    switch (currentTool) {
        case "add_text": {
            dispatch({
                type: "add",
                state: {
                    type: "text",
                    id: overlays.length,
                    value: {
                        style: {
                            top: e.clientY - e.currentTarget.getBoundingClientRect().top,
                            left: e.clientX - e.currentTarget.getBoundingClientRect().left,
                            color: "black",
                            fontSize: 24,
                            textAlign: "start",
                            fontFamily: "Serif",
                        },
                        text: "Text Here"
                    }
                }
            });
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
                            top: 0,
                            left: 0,
                        }
                    }
                }
            });
            break;
        }
    }
};
