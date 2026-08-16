/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { Button } from "@components/Button";
import { DeleteIcon, PaintbrushIcon, ReplyIcon } from "@components/Icons";
import { classNameFactory } from "@utils/css";
import definePlugin, { IconComponent } from "@utils/types";
import { RenderModalProps } from "@vencord/discord-types";
import { ChannelStore, DraftType, Modal, openModal, SelectedChannelStore, showToast, UploadHandler, useEffect, useRef, useState } from "@webpack/common";

import managedStyle from "./style.css?managed";

const cl = classNameFactory("vc-scribble-");

const MAX_HISTORY = 20;

const ScribbleIcon: IconComponent = ({ height = 24, width = 24, className }) => (
    <svg width={width} height={height} className={className} viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
);

function ScribbleModal({ rootProps }: { rootProps: RenderModalProps; }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawingRef = useRef(false);
    const historyRef = useRef<ImageData[]>([]);

    const [color, setColor] = useState("#000000");
    const [brushSize, setBrushSize] = useState(4);
    const [canUndo, setCanUndo] = useState(false);

    const colorRef = useRef(color);
    const sizeRef = useRef(brushSize);

    useEffect(() => {
        colorRef.current = color;
    }, [color]);

    useEffect(() => {
        sizeRef.current = brushSize;
    }, [brushSize]);

    function saveState() {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;

        const history = historyRef.current;
        if (history.length >= MAX_HISTORY) history.shift();
        history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
        setCanUndo(history.length > 1);
    }

    function undo() {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;

        const history = historyRef.current;
        if (history.length <= 1) return;

        history.pop();
        ctx.putImageData(history[history.length - 1], 0, 0);
        setCanUndo(history.length > 1);
    }

    function clearCanvas() {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        saveState();
    }

    function insertScribble() {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.toBlob(blob => {
            if (!blob) return;

            const file = new File([blob], `scribble_${Date.now()}.png`, { type: "image/png" });
            const channelId = SelectedChannelStore.getChannelId();
            const channel = ChannelStore.getChannel(channelId);
            if (!channel) {
                showToast("No channel selected to insert the scribble into.");
                return;
            }

            UploadHandler.promptToUpload([file], channel, DraftType.ChannelMessage);
            rootProps.onClose();
        }, "image/png");
    }

    useEffect(() => {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        saveState();

        function getCoords(e: PointerEvent) {
            const rect = canvas.getBoundingClientRect();
            return {
                x: (e.clientX - rect.left) * (canvas.width / rect.width),
                y: (e.clientY - rect.top) * (canvas.height / rect.height)
            };
        }

        function onPointerDown(e: PointerEvent) {
            const { x, y } = getCoords(e);
            drawingRef.current = true;
            ctx.beginPath();
            ctx.moveTo(x, y);
            canvas.setPointerCapture(e.pointerId);
        }

        function onPointerMove(e: PointerEvent) {
            if (!drawingRef.current) return;
            const { x, y } = getCoords(e);
            ctx.strokeStyle = colorRef.current;
            ctx.lineWidth = sizeRef.current;
            ctx.lineTo(x, y);
            ctx.stroke();
        }

        function onPointerUp() {
            if (!drawingRef.current) return;
            drawingRef.current = false;
            ctx.closePath();
            saveState();
        }

        canvas.addEventListener("pointerdown", onPointerDown);
        canvas.addEventListener("pointermove", onPointerMove);
        canvas.addEventListener("pointerup", onPointerUp);
        canvas.addEventListener("pointercancel", onPointerUp);

        return () => {
            canvas.removeEventListener("pointerdown", onPointerDown);
            canvas.removeEventListener("pointermove", onPointerMove);
            canvas.removeEventListener("pointerup", onPointerUp);
            canvas.removeEventListener("pointercancel", onPointerUp);
        };
    }, []);

    return (
        <Modal
            {...rootProps}
            title="Scribble"
            size="sm"
        >
            <div className={cl("content")}>
                <div className={cl("toolbar")}>
                    <div className={cl("toolbar-group")}>
                        <input
                            type="color"
                            value={color}
                            onChange={e => setColor(e.target.value)}
                            title="Brush color"
                        />
                        <input
                            type="range"
                            min={1}
                            max={30}
                            value={brushSize}
                            onChange={e => setBrushSize(Number(e.target.value))}
                            title="Brush size"
                        />
                    </div>
                    <div className={cl("toolbar-group")}>
                        <Button variant="secondary" size="small" className={cl("btn-gap")} onClick={undo} disabled={!canUndo} title="Undo">
                            <ReplyIcon height={14} width={14} /> Undo
                        </Button>
                        <Button variant="secondary" size="small" className={cl("btn-gap")} onClick={clearCanvas} title="Clear canvas">
                            <DeleteIcon height={14} width={14} /> Clear
                        </Button>
                    </div>
                </div>

                <canvas ref={canvasRef} className={cl("canvas")} width={512} height={352} />

                <Button className={`${cl("insert")} ${cl("btn-gap")}`} onClick={insertScribble}>
                    <PaintbrushIcon height={16} width={16} /> Insert Scribble
                </Button>
            </div>
        </Modal>
    );
}

const ScribbleButton: ChatBarButtonFactory = ({ isAnyChat }) => {
    if (!isAnyChat) return null;

    return (
        <ChatBarButton
            tooltip="Insert Scribble"
            onClick={() => openModal(props => <ScribbleModal rootProps={props} />)}
        >
            <ScribbleIcon />
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "Scribble",
    description: "Draw and send scribbles directly from the chat",
    authors: [Devs.saraaa7447],
    tags: ["Utility", "Chat"],
    requiresRestart: true,
    managedStyle,

    chatBarButton: {
        icon: ScribbleIcon,
        render: ScribbleButton
    }
});
