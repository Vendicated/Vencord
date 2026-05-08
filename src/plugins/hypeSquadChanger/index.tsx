/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 1nject
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";
import { definePluginSettings } from "@api/Settings";
import { findByProps } from "@webpack";
import { Button, Forms, Toasts } from "@webpack/common";
import { Devs } from "@utils/constants";

const House = {
    BRAVERY: 1,
    BRILLIANCE: 2,
    BALANCE: 3,
    NONE: 0
} as const;

let modal: HTMLDivElement | null = null;
let isOpen = false;

const settings = definePluginSettings({});

// ─── Get current user token automatically ────────────────────────────────────
function getCurrentToken(): string {
    try {
        const tokenModule = findByProps("getToken");
        if (tokenModule?.getToken) {
            const tok = tokenModule.getToken();
            if (tok) return tok;
        }
    } catch (_) {}
    return "";
}

// ─── Get current user info (avatar + username) ───────────────────────────────
function getCurrentUser(): { username: string; avatarUrl: string } {
    try {
        const UserStore = findByProps("getCurrentUser");
        const user = UserStore?.getCurrentUser?.();
        if (user) {
            const avatarUrl = user.avatar
                ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
                : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(user.id) >> 22n) % 6}.png`;
            return { username: user.globalName || user.username || "Unknown", avatarUrl };
        }
    } catch (_) {}
    return { username: "HypeSquadChanger", avatarUrl: "https://cdn.discordapp.com/embed/avatars/0.png" };
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
function injectStyles() {
    const id = "hypesquadchanger-styles";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
        @keyframes hs-in  { from { opacity:0; transform:translate(-50%,-50%) scale(.88); } to { opacity:1; transform:translate(-50%,-50%) scale(1); } }
        @keyframes hs-out { from { opacity:1; transform:translate(-50%,-50%) scale(1);   } to { opacity:0; transform:translate(-50%,-50%) scale(.88); } }
        #hypesquadchanger-modal.hs-open  { animation: hs-in  .28s cubic-bezier(.175,.885,.32,1.275) forwards; }
        #hypesquadchanger-modal.hs-close { animation: hs-out .22s ease forwards; }

        .hs-btn {
            background: var(--background-secondary-alt, #2b2d31);
            color: var(--text-normal, #dbdee1);
            border: 1px solid var(--background-modifier-accent, #3f4147);
            padding: 12px 14px;
            border-radius: 10px;
            cursor: pointer;
            font-weight: 600;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 10px;
            width: 100%;
            transition: background .15s, border-color .15s, transform .15s;
            font-family: var(--font-primary);
        }
        .hs-btn:hover { background: var(--background-modifier-hover,#35373c); border-color: var(--interactive-normal,#949ba4); transform: translateY(-1px); }
        .hs-btn:active { transform: translateY(0); }

        #hypesquadchanger-backdrop {
            position: fixed; inset: 0; z-index: 999998;
            background: rgba(0,0,0,.5);
            backdrop-filter: blur(3px);
            display: none;
        }
    `;
    document.head.appendChild(style);
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function createModal() {
    if (modal) return;

    const backdrop = document.createElement("div");
    backdrop.id = "hypesquadchanger-backdrop";
    backdrop.onclick = () => toggleModal();
    document.body.appendChild(backdrop);

    modal = document.createElement("div");
    modal.id = "hypesquadchanger-modal";
    modal.style.cssText = `
        position:fixed; top:50%; left:50%;
        z-index:999999;
        background:var(--background-floating,#1e1f22);
        border:1px solid var(--background-modifier-accent,#3f4147);
        border-radius:16px;
        padding:22px;
        width:340px;
        box-shadow:0 24px 60px rgba(0,0,0,.75);
        font-family:var(--font-primary);
        opacity:0; display:none;
    `;

    // ── Header ──
    const header = document.createElement("div");
    header.style.cssText = "display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;";

    const titleWrap = document.createElement("div");
    titleWrap.style.cssText = "display:flex; align-items:center; gap:12px;";

    const { username: currentUsername, avatarUrl: currentAvatarUrl } = getCurrentUser();

    const avatarImg = document.createElement("img");
    avatarImg.src = currentAvatarUrl;
    avatarImg.style.cssText = `
        width:44px; height:44px;
        border-radius:50%;
        object-fit:cover;
        border:2px solid var(--background-modifier-accent,#3f4147);
        flex-shrink:0;
    `;

    const textBlock = document.createElement("div");
    const nameSpan = document.createElement("div");
    nameSpan.textContent = currentUsername;
    nameSpan.style.cssText = "color:var(--header-primary,#f2f3f5); font-size:17px; font-weight:700; letter-spacing:-.4px; line-height:1;";
    const authorSpan = document.createElement("div");
    authorSpan.textContent = "HypeSquadChanger";
    authorSpan.style.cssText = "color:var(--text-muted,#80848e); font-size:11px; margin-top:4px;";
    textBlock.appendChild(nameSpan);
    textBlock.appendChild(authorSpan);

    titleWrap.appendChild(avatarImg);
    titleWrap.appendChild(textBlock);

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "\u2715";
    closeBtn.style.cssText = "background:none;border:none;color:var(--interactive-normal,#949ba4);cursor:pointer;font-size:16px;padding:4px 8px;border-radius:6px;transition:background .15s;";
    closeBtn.onmouseenter = () => { closeBtn.style.background = "var(--background-modifier-hover)"; };
    closeBtn.onmouseleave = () => { closeBtn.style.background = "none"; };
    closeBtn.onclick = () => toggleModal();

    header.appendChild(titleWrap);
    header.appendChild(closeBtn);

    // ── Divider ──
    const divider = document.createElement("div");
    divider.style.cssText = "height:1px;background:var(--background-modifier-accent,#3f4147);margin-bottom:14px;";

    // ── Buttons ──
    const buttons = document.createElement("div");
    buttons.style.cssText = "display:flex;flex-direction:column;gap:9px;";

    const houses: Array<{ label: string; id: number; icon: string }> = [
        { label: "House Bravery",    id: 1, icon: "https://cdn.discordapp.com/badge-icons/8a88d63823d8a71cd5e390baa45efa02.png" },
        { label: "House Brilliance", id: 2, icon: "https://cdn.discordapp.com/badge-icons/011940fd013da3f7fb926e4a1cd2e618.png" },
        { label: "House Balance",    id: 3, icon: "https://cdn.discordapp.com/badge-icons/3aa41de486fa12454c3761e8e223442e.png" },
        { label: "Remove Badge",     id: 0, icon: "" },
    ];

    for (const h of houses) {
        const btn = document.createElement("button");
        btn.className = "hs-btn";

        const iconEl = document.createElement(h.icon ? "img" : "span");
        if (h.icon) {
            (iconEl as HTMLImageElement).src = h.icon;
            iconEl.style.cssText = "width:22px;height:22px;object-fit:contain;flex-shrink:0;image-rendering:crisp-edges;";
        } else {
            iconEl.style.cssText = "width:22px;height:22px;border-radius:50%;background:var(--background-modifier-accent,#3f4147);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:13px;color:var(--text-muted,#80848e);";
            iconEl.textContent = "\u2715";
        }

        const lbl = document.createElement("span");
        lbl.textContent = h.label;
        btn.appendChild(iconEl);
        btn.appendChild(lbl);

        btn.onclick = async () => {
            const tok = getCurrentToken();
            if (!tok) {
                Toasts.show({ id: Toasts.genId(), message: "Could not detect token automatically.", type: Toasts.Type.FAILURE });
                return;
            }
            await switchHouseWithToken(h.id, tok);
            toggleModal();
        };
        buttons.appendChild(btn);
    }

    // ── Footer ──
    const footer = document.createElement("div");
    footer.textContent = "Restart Discord to see badge changes in your profile";
    footer.style.cssText = "color:var(--text-muted,#80848e);font-size:11px;margin-top:14px;text-align:center;opacity:.6;";

    modal.appendChild(header);
    modal.appendChild(divider);
    modal.appendChild(buttons);
    modal.appendChild(footer);
    document.body.appendChild(modal);
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
function toggleModal() {
    isOpen = !isOpen;
    const backdrop = document.getElementById("hypesquadchanger-backdrop");
    if (isOpen) {
        if (!modal) createModal();
        if (modal) {
            if (backdrop) backdrop.style.display = "block";
            modal.style.display = "block";
            modal.classList.remove("hs-close");
            void modal.offsetWidth;
            modal.classList.add("hs-open");
        }
    } else {
        if (modal) {
            modal.classList.remove("hs-open");
            modal.classList.add("hs-close");
            if (backdrop) backdrop.style.display = "none";
            setTimeout(() => { if (modal) modal.style.display = "none"; }, 250);
        }
    }
}

// ─── API with token ───────────────────────────────────────────────────────────
async function switchHouseWithToken(houseId: number, token: string) {
    const headers: Record<string, string> = {
        "Authorization": token,
        "Content-Type": "application/json"
    };
    const names: Record<number, string> = { 1: "Bravery", 2: "Brilliance", 3: "Balance", 0: "removed" };
    try {
        let res: Response;
        if (houseId === House.NONE) {
            res = await fetch("https://discord.com/api/v9/hypesquad/online", { method: "DELETE", headers });
        } else {
            res = await fetch("https://discord.com/api/v9/hypesquad/online", {
                method: "POST", headers,
                body: JSON.stringify({ house_id: houseId })
            });
        }
        const ok = res.status === 204 || res.ok;
        Toasts.show({
            id: Toasts.genId(),
            message: ok ? `Switched to Hypesquad ${names[houseId]}` : `Failed (${res.status})`,
            type: ok ? Toasts.Type.SUCCESS : Toasts.Type.FAILURE
        });
    } catch (e: any) {
        Toasts.show({ id: Toasts.genId(), message: `Error: ${e?.message ?? "Unknown"}`, type: Toasts.Type.FAILURE });
    }
}

// ─── Settings Panel ───────────────────────────────────────────────────────────
function SettingsPanel() {
    return (
        <div style={{ padding: "16px" }}>
            <Forms.FormTitle tag="h3" style={{ marginBottom: "8px" }}>HypeSquadChanger</Forms.FormTitle>
            <Forms.FormText style={{ marginBottom: "16px", fontSize: "13px" }}>
                Your token is detected automatically. Just open the panel and switch your house directly.
            </Forms.FormText>
            <Button onClick={() => toggleModal()} color={Button.Colors.PRIMARY} style={{ marginBottom: "12px" }}>
                Open HypeSquadChanger Panel
            </Button>
        </div>
    );
}

// ─── Plugin ───────────────────────────────────────────────────────────────────
export default definePlugin({
    name: "HypeSquadChanger",
    description: "Switch your Hypesquad house badge easily.",  
    authors: [Devs.cute],
    settings,
    settingsAboutComponent: SettingsPanel,

    start() {
        injectStyles();
        console.log("[HypeSquadChanger] Loaded");
    },

    stop() {
        if (modal) { modal.remove(); modal = null; }
        const backdrop = document.getElementById("hypesquadchanger-backdrop");
        if (backdrop) backdrop.remove();
        const style = document.getElementById("hypesquadchanger-styles");
        if (style) style.remove();
        isOpen = false;
    }
});

