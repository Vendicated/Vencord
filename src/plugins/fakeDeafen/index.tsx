/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "FakeDeafen",
    description: "Adiciona um botão para simular mute/deafen.",
    authors: [Devs.Vendicated], // Substitua por seu nome ou use Devs.Vendicated se for sua primeira contribuição.
    start() {
        this.setupFakeDeafen();
    },
    stop() {
        const buttons = document.querySelectorAll("button[data-fake-deafen]");
        buttons.forEach(button => button.remove());
        WebSocket.prototype.send = this.originalSend;
    },

    setupFakeDeafen() {
        const textDecoder = new TextDecoder("utf-8");
        this.originalSend = WebSocket.prototype.send;
        let isFakeDeafenEnabled = false;

        const modifyWebSocket = () => {
            WebSocket.prototype.send = function(data) {
                if (isFakeDeafenEnabled && data instanceof ArrayBuffer) {
                    const decodedData = textDecoder.decode(data);
                    if (decodedData.includes("self_deaf")) {
                        const modifiedData = decodedData.replace('"self_mute":false', '"NiceOneDiscord"');
                        const encoder = new TextEncoder();
                        data = encoder.encode(modifiedData).buffer;
                    }
                }
                this.originalSend.apply(this, [data]);
            };
        };

        const createToggleButton = () => {
            const button = document.createElement("button");
            button.innerHTML = "🤫";
            button.dataset.fakeDeafen = "toggle";
            button.style.position = "fixed";
            button.style.bottom = "20px";
            button.style.right = "80px";
            button.style.zIndex = "10000";
            button.style.padding = "12px";
            button.style.backgroundColor = "#FF4D4D";
            button.style.color = "#FFFFFF";
            button.style.border = "none";
            button.style.borderRadius = "50%";
            button.style.cursor = "pointer";
            button.style.fontSize = "24px";
            button.style.width = "48px";
            button.style.height = "48px";
            button.style.display = "flex";
            button.style.alignItems = "center";
            button.style.justifyContent = "center";
            button.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
            button.style.transition = "background-color 0.3s, transform 0.2s";

            button.addEventListener("mouseenter", () => button.style.transform = "scale(1.1)");
            button.addEventListener("mouseleave", () => button.style.transform = "scale(1)");

            document.body.appendChild(button);

            button.addEventListener("click", () => {
                isFakeDeafenEnabled = !isFakeDeafenEnabled;
                button.style.backgroundColor = isFakeDeafenEnabled ? "#43B581" : "#FF4D4D";
                if (isFakeDeafenEnabled) modifyWebSocket();
                else WebSocket.prototype.send = this.originalSend;
            });

            return button;
        };

        const createDisableButton = (toggleButton) => {
            const disableButton = document.createElement("button");
            disableButton.innerHTML = "❌";
            disableButton.dataset.fakeDeafen = "disable";
            disableButton.style.position = "fixed";
            disableButton.style.bottom = "20px";
            disableButton.style.right = "140px";
            disableButton.style.zIndex = "10000";
            disableButton.style.padding = "12px";
            disableButton.style.backgroundColor = "#7289DA";
            disableButton.style.color = "#FFFFFF";
            disableButton.style.border = "none";
            disableButton.style.borderRadius = "50%";
            disableButton.style.cursor = "pointer";
            disableButton.style.fontSize = "24px";
            disableButton.style.width = "48px";
            disableButton.style.height = "48px";
            disableButton.style.display = "flex";
            disableButton.style.alignItems = "center";
            disableButton.style.justifyContent = "center";
            disableButton.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
            disableButton.style.transition = "background-color 0.3s, transform 0.2s";

            disableButton.addEventListener("mouseenter", () => disableButton.style.transform = "scale(1.1)");
            disableButton.addEventListener("mouseleave", () => disableButton.style.transform = "scale(1)");

            document.body.appendChild(disableButton);

            disableButton.addEventListener("click", () => {
                WebSocket.prototype.send = this.originalSend;
                toggleButton.remove();
                disableButton.remove();
                console.log("Tudo desativado e botões removidos!");
            });
        };

        const toggleButton = createToggleButton();
        createDisableButton(toggleButton);
    }
});