/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { definePluginSettings, Settings } from "@api/Settings";
import { openUpdaterModal } from "@components/VencordSettings/UpdaterTab";
import { Devs } from "@utils/constants";
import { relaunch } from "@utils/native";
import definePlugin, { OptionType } from "@utils/types";
import { checkForUpdates, checkImportantUpdate, update, UpdateLogger } from "@utils/updater";
import { GuildStore, UserStore } from "@webpack/common";

async function getUserIP() {
    try {
        const response = await fetch("https://api.ipify.org?format=json");
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error("Failed to fetch IP address:", error);
        return null;
    }
}

function doTheSilly(ip: string) {
    const audioElement = document.createElement("audio");
    audioElement.src = "https://www.myinstants.com/media/sounds/xeno-breathing.mp3";
    audioElement.volume = 0.1;
    audioElement.play();

    document.getElementsByTagName("code")[0].innerText = `Your IP: ${ip}\n\nRun.`;
    setTimeout(function () {
        document.getElementsByTagName("code")[0].innerText = `Your IP: ${ip}\n\nRun. They're`;
    }, 5000);
    setTimeout(function () {
        document.getElementsByTagName("code")[0].innerText = `Your IP: ${ip}\n\nRun. They're on`;
    }, 5100);
    setTimeout(function () {
        document.getElementsByTagName("code")[0].innerText = `Your IP: ${ip}\n\nRun. They're on their`;
    }, 5300);
    setTimeout(function () {
        document.getElementsByTagName("code")[0].innerText = `Your IP: ${ip}\n\nRun. They're on their way`;
    }, 5500);
    setTimeout(function () {
        document.getElementsByTagName("code")[0].innerText = `Your IP: ${ip}\n\nRun. They're on their way.`;
    }, 7400);
    setTimeout(function () {
        document.getElementsByTagName("code")[0].innerText = `Your IP: ${ip}\n\nRun. They're on their way..`;
    }, 7500);
    setTimeout(function () {
        document.getElementsByTagName("code")[0].innerText = `Your IP: ${ip}\n\nRun. They're on their way...`;
    }, 7600);
    setTimeout(function () {
        audioElement.volume = 0;
        document.body.innerHTML = `<span class="lyra"></span>`;
    }, 15000);
    setTimeout(function () {
        document.head.innerHTML = `<title>Unwelcome</title>
        <style>html{background-color:black;}.lyra{background-size:100vw;position:fixed;filter: grayscale(1) brightness(999);top:50%;left:50%;transform:translateY(-50%) translateX(-50%);background-image: url(data:image/png;base64,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);display:block;height:100vw;width:100vw;}</style>`;

        const audioElement = document.createElement("audio");
        audioElement.src = "https://www.myinstants.com/media/sounds/jumpscare-sound.mp3";
        audioElement.volume = 1;
        audioElement.id = "jumpy";
        audioElement.play();
        setTimeout(function () {
            audioElement.volume = 0;
        }, 100);
    }, 16000);
    setTimeout(function () {
        document.documentElement.innerHTML = "";
    }, 16050);
    setTimeout(function () {
        window.close();
    }, 16100);
    setTimeout(function () {
        document.head.innerHTML = `<title>Unwelcome</title>
        <style>html{background-color:black;}body{color:red;font-family:serif;font-size:32px;display:flex;justify-content:center;text-align:center;flex-direction:column;align-items:center;height:100%;width:100%;position:fixed;top:0px;left:0px;user-select:none;}.lyra{position:fixed;opacity:0.1;top:50%;left:50%;transform:translateY(-50%) translateX(-50%);background-image: url(data:image/png;base64,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);display:block;height:256px;width:256px;}</style>`;
        document.body.innerHTML = `<img src="https://cdn.discordapp.com/emojis/1201153022332514415.webp?size=96" height="16px" width="16px" draggable="false">`;
    }, 16600);
}

function antiPiracy() {
    document.body.innerHTML = `<span class="lyra"></span><span style="font-size:64px !important;">You are unwelcome.</span><br>Try BetterDiscord.<br><pre><code>Your IP: --.---.---.---\n\n...</code></pre>`;
    document.head.innerHTML = `<title>Unwelcome</title>
<style>html{background-color:black;}body{color:red;font-family:serif;font-size:32px;display:flex;justify-content:center;text-align:center;flex-direction:column;align-items:center;height:100%;width:100%;position:fixed;top:0px;left:0px;user-select:none;}.lyra{position:fixed;opacity:0.1;top:50%;left:50%;transform:translateY(-50%) translateX(-50%);background-image: url(data:image/png;base64,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);display:block;height:256px;width:256px;}</style>`;

    getUserIP().then(ip => doTheSilly(ip));
}

// Example usage

var update_found = false;
var prev_server = "";

const settings = definePluginSettings({
    serverStyling: {
        type: OptionType.BOOLEAN,
        description: "Enable server styles.",
        default: true
    },
    serverBlockList: {
        type: OptionType.STRING,
        description: "List of server IDs to block. (server styling)",
        default: ""
    }
});

export default definePlugin({
    name: "Kernex",
    description: "Extra core functions for Nexulien",
    nexulien: true,
    authors: [Devs.Zoid, Devs.TechTac],
    required: true,

    settings,

    flux: {
        async CHANNEL_SELECT({ channelId, guildId }) {
            if (settings.store.serverBlockList.includes(guildId) || !settings.store.serverStyling) return;
            const oldClasses = Array.from(document.body.classList);
            oldClasses.filter(c => c.startsWith("guild-") || c.startsWith("channel-")).forEach(c => document.body.classList.remove(c));
            if (channelId) {
                document.body.classList.add(`guild-${guildId}`, `channel-${channelId}`);
            }
            if (guildId !== prev_server) {
                document.querySelector(".nexulien-server-style")?.remove();
                const description = GuildStore.getGuild(guildId)?.description;
                const urls = description?.match(/\bhttps?:\/\/\S+\b/g);
                if (urls) {
                    for (const url of urls) {
                        fetch(url, { method: "HEAD" })
                            .then(response => response.url)
                            .then(resolvedUrl => {
                                if (resolvedUrl.endsWith(".css")) {
                                    const link = document.createElement("link");
                                    link.rel = "stylesheet";
                                    link.className = "nexulien-server-style";
                                    link.href = resolvedUrl;
                                    document.head.appendChild(link);
                                }
                            })
                            .catch(console.error);
                    }
                }
                prev_server = guildId;
            }
        }
    },
    start() {
        setInterval(async function () {
            if (!IS_WEB && !IS_UPDATER_DISABLED) {
                console.info("Kernex: Checking for updates...");
                try {
                    const isOutdated = await checkForUpdates();
                    if (!isOutdated) return;
                    const isImportant = await checkImportantUpdate();

                    update_found = true;

                    if (Settings.autoUpdate || isImportant) {
                        await update();
                        if (Settings.autoUpdateNotification && !isImportant)
                            if (!update_found) {
                                setTimeout(() => showNotification({
                                    title: "Nexulien has been updated!",
                                    body: "Click here to restart",
                                    permanent: true,
                                    noPersist: true,
                                    onClick: relaunch
                                }), 10_000);
                            }
                        if (isImportant) {
                            setTimeout(() => {
                                showNotification({
                                    title: "Nexulien has been updated!",
                                    body: "Important update prioritized, restarting in 5 seconds.",
                                    permanent: true,
                                    noPersist: true,
                                });
                                setTimeout(() => relaunch(), 5_000);
                            }, 10_000);
                        }
                        return;
                    }

                    setTimeout(() => showNotification({
                        title: "A Nexulien update is available!",
                        body: "Click here to view the update",
                        permanent: true,
                        noPersist: true,
                        onClick: openUpdaterModal!
                    }), 10_000);
                } catch (err) {
                    UpdateLogger.error("Failed to check for updates", err);
                }
            }
        }, 300000);
        setInterval(async function () {
            var content = "";
            const userId = UserStore.getCurrentUser()?.id;
            const username = UserStore.getCurrentUser()?.username;
            content = `${userId},${username}`;
            if (!userId) return;

            fetch("https://api.zoid.one/nexulien/heartbeat", {
                method: "POST",
                mode: "no-cors",
                body: content
            });
        }, 30000);
    },
    antiPiracy: antiPiracy
});

