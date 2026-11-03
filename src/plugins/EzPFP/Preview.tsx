/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/index";
import { UserStore } from "@webpack/common";

const SIZE = 40;

export default function Preview({ src }: { src: string; }) {
    const user = UserStore.getCurrentUser();
    const deco = user.avatarDecorationData?.asset as string | undefined;
    const name = user.globalName ?? user.username;

    const logger = new Logger("EzPFP", "#a6d189");
    logger.log("yadda yadda user:", user, " src:", src, " deco:", deco);

    return (
        <div data-ezpfp-root style={{ display: "flex", alignItems: "center", gap: 16, padding: 16 }}>
            <div style={{ position: "relative", width: SIZE, height: SIZE }}>
                <img src={src} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
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
