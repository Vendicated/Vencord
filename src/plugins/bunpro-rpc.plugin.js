// =====================================================
//  BUNPRO RPC — VENCORD PLUGIN
//  Page Detection + Settings + WebSocket Client
// =====================================================

import { definePluginSettings, registerPluginSettings } from "@api/settings";

// ------------------------------
// 1. Plugin settings
// ------------------------------
const settings = definePluginSettings({
    bunproApiKey: {
        type: "string",
        default: "",
        description: "Your Bunpro API Key"
    },
    referralLink: {
        type: "string",
        default: "https://bunpro.jp/referrals/user/nkgq3fec",
        description: "Your Bunpro referral link (optional)"
    }
});

registerPluginSettings("bunpro-rpc", settings);

// ------------------------------
// 2. WebSocket connection to the RPC script
// ------------------------------
let ws = null;

function createSocket() {
    try {
        ws = new WebSocket("ws://localhost:8765");

        ws.onopen = () => {
            // Optional: debug log in browser console
            // console.log("[Bunpro RPC] WebSocket connected");
        };

        ws.onerror = () => {
            // Do nothing to avoid spamming Discord's console
        };

        ws.onclose = () => {
            // Optional: debug log
            // console.log("[Bunpro RPC] WebSocket closed, retrying in 3s…");
            ws = null;
            // Auto-reconnect after 3 seconds
            setTimeout(createSocket, 3000);
        };
    } catch {
        // If WebSocket creation fails immediately,
        // retry later as well.
        setTimeout(createSocket, 3000);
    }
}

createSocket();

// ------------------------------
// 3. Bunpro page detection
// ------------------------------
let lastSentState = "";

// Sends data to the RPC only if the WebSocket is open
function sendUpdate(pageState) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    ws.send(JSON.stringify({
        page: pageState,
        apiKey: settings.bunproApiKey,
        referral: settings.referralLink
    }));
}

function detectPage() {
    const url = window.location.pathname + window.location.search;
    let pageState = "browsing";

    // Dashboard
    if (url.includes("/dashboard")) {
        pageState = "dashboard";
    }

    // Reviews
    else if (url.includes("/reviews")) {
        pageState = "reviews";
    }

    // Learn / Study
    else if (url.includes("/learn")) {
        pageState = "learn";
    }

    // Grammar point (ex: /grammar_points/てから)
    else if (url.includes("/grammar_points/")) {
        const raw = url.split("/grammar_points/")[1];
        const grammar = raw.split(/[?\/]/)[0];
        pageState = `grammar_points:${decodeURIComponent(grammar)}`;
    }

    // Decks
    else if (url.includes("/decks")) {
        pageState = "decks";
    }

    // Avoid sending the same state repeatedly
    if (pageState === lastSentState) return;
    lastSentState = pageState;

    sendUpdate(pageState);
}

// Initial detection
detectPage();

// Detect URL changes (SPA navigation)
let lastUrl = location.href;
setInterval(() => {
    if (location.href !== lastUrl) {
        lastUrl = location.href;
        detectPage();
    }
}, 500);
