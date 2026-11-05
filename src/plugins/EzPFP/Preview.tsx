/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, UserStore, useState } from "@webpack/common";

export interface EditorState {
    crop: { width: number; height: number; };
    image: { width: number; height: number; };
    rotation: number;
    zoom: number;
}

let currentOffset = { x: 0, y: 0 };
const subscribers = new Set<(o: { x: number; y: number; }) => void>();

export function updateOffset(newOffset: { x: number; y: number; }) {
    currentOffset = { x: newOffset.x, y: newOffset.y };
    subscribers.forEach(update => update(currentOffset));
}

function useOffset() {
    const [offset, setOffset] = useState(currentOffset);

    useEffect(() => {
        subscribers.add(setOffset);
        return () => void subscribers.delete(setOffset);
    }, []);

    return offset;
}

function CropCircle({ src, size, state }: { src: string; size: number; state: EditorState; }) {
    const { x, y } = useOffset();
    const { crop, image, rotation, zoom } = state;

    if (image == null || crop.width <= 0) return null;

    const sideways = rotation % 180 !== 0;
    const scale = size / crop.width;
    const w = (sideways ? image.height : image.width) * zoom * scale;
    const h = (sideways ? image.width : image.height) * zoom * scale;

    return (
        <div style={{ width: size, height: size, position: "relative", overflow: "hidden", borderRadius: "50%" }}>
            <img
                src={src}
                draggable={false}
                style={{
                    position: "absolute", top: "50%", left: "50%",
                    maxWidth: "none", maxHeight: "none",
                    width: w, height: h,
                    transform: `translate(-50%, -50%) translate(${x * scale}px, ${y * scale}px) rotate(${rotation}deg)`
                }}
            />
        </div>
    );
}

function PFPAndDeco({ src, size, state, deco }: { src: string; size: number; state: EditorState; deco: string | undefined; }) {

    return (
        <div style={{ position: "relative", width: size, height: size }}>
            <CropCircle src={src} size={size} state={state} />
            {deco && (
                <img
                    src={`https://cdn.discordapp.com/avatar-decoration-presets/${deco}.png?size=128`}
                    draggable={false}
                    style={{ position: "absolute", top: -size * 0.1, left: -size * 0.1, width: size * 1.2, height: size * 1.2, pointerEvents: "none" }}
                />
            )}
        </div>
    );
}

function InChatPreview({ src, state, isPFPModal, SIZE }: { src: string; state: EditorState; isPFPModal: boolean; SIZE: number; }) {
    const user = UserStore.getCurrentUser();
    const deco = user.avatarDecorationData?.asset as string | undefined;
    const name = user.globalName ?? user.username;

    if (!isPFPModal) return null;

    return (
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: 16 }}>
            <PFPAndDeco src={src} size={SIZE} state={state} deco={deco} />
            <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ color: "var(--header-primary)", fontWeight: 500, fontSize: 16, lineHeight: "1.375rem" }}>{name}</span>
                <span style={{ color: "var(--text-default)", fontWeight: 400, fontSize: 16, lineHeight: "1.375rem" }}>Hello Peter, welcome to fortnite</span>
            </div>
        </div>
    );
}


export default function FullPreview({ src, state, isPFPModal }: { src: string; state: EditorState; isPFPModal: boolean; }) {
    return (
        <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <InChatPreview src={src} state={state} isPFPModal={isPFPModal} SIZE={40} />
                <InChatPreview src={src} state={state} isPFPModal={isPFPModal} SIZE={80} />
            </div>
        </div>
    );
}
