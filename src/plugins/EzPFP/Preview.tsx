/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/index";
import { useEffect, useRef, UserStore } from "@webpack/common";

const SIZE = 40;
const logger = new Logger("EzPFP", "#a6d189");

function CropCircle({ src, size }: { src: string; size: number; }) {
    const box = useRef<HTMLDivElement>(null);
    const img = useRef<HTMLImageElement>(null);

    useEffect(() => {
        let raf = 0;
        const tick = () => {
            const root = box.current?.closest("[data-ezpfp-root]");
            const editorImage = [...(root?.parentElement?.querySelectorAll("img") ?? [])]
                .find(img => !root!.contains(img));
            const frame = editorImage?.nextElementSibling as HTMLElement | null;

            if (editorImage && frame?.offsetWidth) {
                const boxStyle = box.current!.style;
                boxStyle.width = frame.offsetWidth + "px";
                boxStyle.height = frame.offsetHeight + "px";
                boxStyle.transform = `scale(${size / frame.offsetWidth})`;

                img.current!.style.cssText = editorImage.style.cssText + ";max-width:none;max-height:none";
            }
            raf = requestAnimationFrame(tick);
        };
        tick();
        return () => cancelAnimationFrame(raf);
    }, [size]);

    return (
        <div style={{ width: size, height: size, position: "relative", overflow: "hidden", borderRadius: "50%" }}>
            <div ref={box} style={{ position: "absolute", top: 0, left: 0, transformOrigin: "top left", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                <img ref={img} src={src} style={{ opacity: 0 }} />
            </div>
        </div>
    );
}

export default function Preview({ src }: { src: string; }) {
    const user = UserStore.getCurrentUser();
    const deco = user.avatarDecorationData?.asset as string | undefined;
    const name = user.globalName ?? user.username;

    logger.log("yadda yadda user:", user, " src:", src, " deco:", deco);

    return (
        <div data-ezpfp-root style={{ display: "flex", alignItems: "center", gap: 16, padding: 16 }}>
            <div style={{ position: "relative", width: SIZE, height: SIZE }}>
                <CropCircle src={src} size={SIZE} />
                {deco && (
                    <img
                        src={`https://cdn.discordapp.com/avatar-decoration-presets/${deco}.png?size=128`}
                        style={{ position: "absolute", top: -SIZE * 0.1, left: -SIZE * 0.1, width: SIZE * 1.2, height: SIZE * 1.2 }}
                    />
                )}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ color: "var(--header-primary)", fontWeight: 500, fontSize: 16, lineHeight: "1.375rem" }}>{name}</span>
                <span style={{ color: "var(--text-default)", fontWeight: 400, fontSize: 16, lineHeight: "1.375rem" }}>Hello Peter, welcome to fortnite</span>
            </div>
        </div>
    );
}
