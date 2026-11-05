/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, UserProfileStore, UserStore, useState, useStateFromStores } from "@webpack/common";

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

function PFPAndDeco({ src, size, state, deco, decoVisible }: { src: string; size: number; state: EditorState; deco: string | undefined; decoVisible: boolean; }) {

    return (
        <div style={{ position: "relative", width: size, height: size }}>
            <CropCircle src={src} size={size} state={state} />
            {deco && decoVisible && (
                <img
                    src={`https://cdn.discordapp.com/avatar-decoration-presets/${deco}.png?size=128`}
                    draggable={false}
                    style={{ position: "absolute", top: -size * 0.1, left: -size * 0.1, width: size * 1.2, height: size * 1.2, pointerEvents: "none" }}
                />
            )}
        </div>
    );
}

function InChatPreview({ src, state, SIZE, decoVisible }: { src: string; state: EditorState; SIZE: number; decoVisible: boolean; }) {
    const user = UserStore.getCurrentUser();
    const deco = user.avatarDecorationData?.asset as string | undefined;
    const name = user.globalName ?? user.username;

    return (
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: 16 }}>
            <PFPAndDeco src={src} size={SIZE} state={state} deco={deco} decoVisible={decoVisible} />
            <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ color: "var(--header-primary)", fontWeight: 500, fontSize: 16, lineHeight: "1.375rem" }}>{name}</span>
                <span style={{ color: "var(--text-default)", fontWeight: 400, fontSize: 16, lineHeight: "1.375rem" }}>Hello Peter, welcome to fortnite</span>
            </div>
        </div>
    );
}


function ProfileBannerPreview({ src, state, size, decoVisible }: { src: string; state: EditorState; size: number; decoVisible: boolean; }) {
    const user = UserStore.getCurrentUser();
    const profile = useStateFromStores([UserProfileStore], () => UserProfileStore.getUserProfile(user.id));
    const RING = 6;

    const deco = user.avatarDecorationData?.asset;

    const bannerHash = profile?.banner ?? user.banner;
    const bannerUrl = bannerHash
        ? `https://cdn.discordapp.com/banners/${user.id}/${bannerHash}.${bannerHash.startsWith("a_") ? "gif" : "png"}?size=300`
        : null;
    const fallbackColor = profile?.accentColor != null
        ? `#${profile.accentColor.toString(16).padStart(6, "0")}`
        : "#000000";

    const outer = size + RING * 2;

    return (
        <div style={{ width: 300, borderRadius: 8, overflow: "hidden", background: "#232428" }}>
            <div style={{ height: 105, background: bannerUrl ? `center / cover url(${bannerUrl})` : fallbackColor }} />

            <div style={{ position: "relative", padding: `${outer / 2 + 8}px 16px 16px` }}>
                <div style={{
                    position: "absolute", top: -outer / 2 - 7, left: 10,
                    width: outer, height: outer, borderRadius: "50%", background: "#232428",
                    display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                    <PFPAndDeco src={src} size={size} state={state} deco={deco} decoVisible={decoVisible} />
                </div>

                <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ color: "var(--text-default)", fontWeight: 600, fontSize: 20, lineHeight: "1.375rem" }}>{user.globalName ?? user.username}</span>
                    <span style={{ color: "var(--text-strong)", fontWeight: 400, fontSize: 14, lineHeight: "1.375rem" }}>{user.username}</span>
                </div>
            </div>
        </div>
    );
}

export default function FullPreview({ src, state, isPFPModal }: { src: string; state: EditorState; isPFPModal: boolean; }) {
    if (!isPFPModal) return null;
    const [decoVisible, setDecoVisible] = useState<boolean>(true);

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                <ProfileBannerPreview src={src} state={state} size={80} decoVisible={decoVisible} />
                <InChatPreview src={src} state={state} SIZE={40} decoVisible={decoVisible} />
            </div>
            <button
                style={{ backgroundColor: "var(--control-primary-background-default)", color: "white", borderRadius: 8, width: "fit-content", padding: "4px 8px" }}
                onClick={() => setDecoVisible(!decoVisible)}>Decoration {decoVisible ? "On" : "Off"}</button>
        </div>
    );
}
