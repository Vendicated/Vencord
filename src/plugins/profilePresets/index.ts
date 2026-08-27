/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import definePlugin from "@utils/types";
import { RestAPI, UserStore } from "@webpack/common";

interface ProfilePreset {
    bio?: string;
    avatarBase64?: string | null;
    bannerBase64?: string | null;
    themeColors?: number[] | null;
    profileEffectId?: string | null;
}

const STORAGE_KEY = "ProfilePresets_data";
let observer: MutationObserver | null = null;
let selectedPreset: string | null = null;

async function toBase64(url: string, ext: string): Promise<string> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch image from ${url}`);
    const blob = await res.blob();
    
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            let resStr = reader.result as string;
            if (resStr.startsWith("data:application/octet-stream")) {
                resStr = resStr.replace("data:application/octet-stream", `data:${ext === "gif" ? "image/gif" : "image/png"}`);
            }
            resolve(resStr);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function renderUI(root: HTMLElement) {
    const presets: Record<string, ProfilePreset> = (await DataStore.get(STORAGE_KEY)) || {};
    const names = Object.keys(presets);

    let list = "";
    if (!names.length) {
        list = `<div style="color: #b5bac1; font-size: 13px; font-weight: 500;">No presets saved yet.</div>`;
    } else {
        list = `<div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 12px;">`;
        for (const name of names) {
            const data = presets[name];
            const pfp = data.avatarBase64 || "https://cdn.discordapp.com/embed/avatars/0.png";
            const banner = data.bannerBase64 || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
            const active = selectedPreset === name;
            const border = active ? "2px solid #5865f2" : "2px solid rgba(255,255,255,0.2)";

            list += `
                <div class="preset-card" data-name="${name}" style="position: relative; width: 64px; height: 64px; border-radius: 8px; overflow: hidden; cursor: pointer; border: ${border}; transition: all 0.2s ease;" title="${name}">
                    <img src="${banner}" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.5; position: absolute; top: 0; left: 0; z-index: 1;" />
                    <img src="${pfp}" style="width: 34px; height: 34px; border-radius: 50%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); border: 2px solid rgba(0,0,0,0.5); z-index: 2; object-fit: cover;" />
                </div>
            `;
        }
        list += "</div>";
    }

    let controls = "";
    if (selectedPreset && presets[selectedPreset]) {
        controls = `
            <div style="background: rgba(0,0,0,0.4); border-radius: 8px; padding: 10px; border: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; gap: 8px;">
                <div style="font-weight: 700; font-size: 13px; color: #f2f3f5;">Selected: <span style="color: #5865f2;">${selectedPreset}</span></div>
                <div style="display: flex; gap: 8px;">
                    <button id="pp-apply-btn" style="flex: 1; padding: 6px; border-radius: 4px; background: #248046; color: #fff; border: none; font-size: 12px; font-weight: 600; cursor: pointer;">Apply</button>
                    <button id="pp-del-btn" style="flex: 1; padding: 6px; border-radius: 4px; background: #da373c; color: #fff; border: none; font-size: 12px; font-weight: 600; cursor: pointer;">Delete</button>
                </div>
            </div>
        `;
    }

    root.innerHTML = `
        <div style="margin-bottom: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1);">
            <h3 style="color: #f2f3f5; font-size: 12px; font-weight: 800; text-transform: uppercase; margin-bottom: 8px;">Profile Presets</h3>
            ${list}
            ${controls}
            <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 12px;">
                <input id="pp-name-input" placeholder="Preset name..." style="width: 100%; padding: 8px 10px; border-radius: 4px; background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.2); color: #ffffff; font-size: 13px; outline: none; box-sizing: border-box;" />
                <button id="pp-save-btn" style="width: 100%; padding: 8px; border-radius: 4px; background: #5865f2; color: #fff; border: none; font-size: 13px; font-weight: 600; cursor: pointer;">Save Current Profile</button>
            </div>
            <div id="pp-status" style="margin-top: 8px; font-size: 12px; font-weight: 600; color: #b5bac1; text-align: center;"></div>
        </div>
    `;

    const status = root.querySelector("#pp-status") as HTMLElement;
    const input = root.querySelector("#pp-name-input") as HTMLInputElement;

    root.querySelectorAll(".preset-card").forEach(el => {
        (el as HTMLElement).onclick = () => {
            selectedPreset = el.getAttribute("data-name");
            renderUI(root);
        };
    });

    const saveBtn = root.querySelector("#pp-save-btn") as HTMLButtonElement;
    if (saveBtn) {
        saveBtn.onclick = async () => {
            const key = input.value.trim().toLowerCase();
            if (!key) {
                status.style.color = "#fa777c";
                status.innerText = "Please enter a preset name.";
                return;
            }

            saveBtn.disabled = true;
            status.style.color = "#f2f3f5";
            status.innerText = "Saving profile snapshot...";

            try {
                const user = UserStore.getCurrentUser();
                if (!user) throw new Error("Current user not found in UserStore");

                const res = await RestAPI.get({ url: `/users/${user.id}/profile` }).catch(() => null);
                const profile = res?.body?.user_profile ?? {};
                const userObj = res?.body?.user ?? {};

                const preset: ProfilePreset = {
                    bio: profile.bio || "",
                    themeColors: profile.theme_colors || null,
                    profileEffectId: profile.profile_effect_id || null,
                    avatarBase64: null,
                    bannerBase64: null
                };

                const avatar = userObj.avatar || user.avatar;
                if (avatar) {
                    const ext = avatar.startsWith("a_") ? "gif" : "png";
                    preset.avatarBase64 = await toBase64(`https://cdn.discordapp.com/avatars/${user.id}/${avatar}.${ext}?size=512`, ext);
                }

                const banner = userObj.banner || user.banner;
                if (banner) {
                    const ext = banner.startsWith("a_") ? "gif" : "png";
                    preset.bannerBase64 = await toBase64(`https://cdn.discordapp.com/banners/${user.id}/${banner}.${ext}?size=1024`, ext);
                }

                const current = (await DataStore.get(STORAGE_KEY)) || {};
                current[key] = preset;
                await DataStore.set(STORAGE_KEY, current);

                selectedPreset = key;
                await renderUI(root);
            } catch (err: any) {
                status.style.color = "#fa777c";
                status.innerText = err?.message || "Failed to save preset.";
                saveBtn.disabled = false;
            }
        };
    }

    const applyBtn = root.querySelector("#pp-apply-btn") as HTMLButtonElement;
    if (applyBtn && selectedPreset) {
        applyBtn.onclick = async () => {
            applyBtn.disabled = true;
            status.style.color = "#f2f3f5";
            status.innerText = `Applying "${selectedPreset}"...`;

            try {
                const current = (await DataStore.get(STORAGE_KEY)) || {};
                const preset = current[selectedPreset!];
                if (!preset) throw new Error("Preset not found in store");

                const meRes = await RestAPI.patch({
                    url: "/users/@me",
                    body: {
                        avatar: preset.avatarBase64 || null,
                        banner: preset.bannerBase64 || null
                    }
                });
                if (meRes.status && meRes.status >= 400) {
                    throw new Error(meRes.body?.message || `Discord API Error ${meRes.status}`);
                }

                const profileRes = await RestAPI.patch({
                    url: "/users/@me/profile",
                    body: {
                        bio: preset.bio || "",
                        theme_colors: preset.themeColors || null,
                        profile_effect_id: preset.profileEffectId || null
                    }
                });
                if (profileRes.status && profileRes.status >= 400) {
                    throw new Error(profileRes.body?.message || `Discord API Error ${profileRes.status}`);
                }

                status.style.color = "#43b581";
                status.innerText = "Preset applied. Reloading...";

                setTimeout(() => window.location.reload(), 800);
            } catch (err: any) {
                status.style.color = "#fa777c";
                status.innerText = err?.message || "Failed to apply preset.";
                applyBtn.disabled = false;
            }
        };
    }

    const delBtn = root.querySelector("#pp-del-btn") as HTMLButtonElement;
    if (delBtn && selectedPreset) {
        delBtn.onclick = async () => {
            const current = (await DataStore.get(STORAGE_KEY)) || {};
            delete current[selectedPreset!];
            await DataStore.set(STORAGE_KEY, current);
            selectedPreset = null;
            await renderUI(root);
        };
    }
}

export default definePlugin({
    name: "ProfilePresets",
    description: "Allows saving and switching between complete profile setups directly inside profile settings.",
    authors: [
        {
            name: "Luciano Ferretti (xLegendirer)",
            id: 832617684285915226n
        }
    ],
    tags: [
        "Customisation",
        "Appearance",
        "Utility"
    ],

    start() {
        observer = new MutationObserver(() => {
            if (document.getElementById("profile-presets-mount")) return;

            const headers = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, div"));
            const target = headers.find(el => {
                const text = el.textContent?.toLowerCase().trim() || "";
                return text === "profil efekti ve çerçeveler" || text.includes("profile effect");
            });

            if (!target) return;

            let col = target.parentElement;
            let depth = 0;

            while (col && col.children.length < 3 && depth < 10) {
                col = col.parentElement;
                if (col === document.body) return;
                depth++;
            }

            if (col && !document.getElementById("profile-presets-mount")) {
                const mount = document.createElement("div");
                mount.id = "profile-presets-mount";
                mount.style.cssText = "width: 100%; box-sizing: border-box;";
                col.appendChild(mount);
                renderUI(mount);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    },

    stop() {
        if (observer) observer.disconnect();
        document.getElementById("profile-presets-mount")?.remove();
        selectedPreset = null;
    }
});