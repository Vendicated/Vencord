import definePlugin, { OptionType } from "@utils/types";
import { AuthenticationStore } from "@webpack/common";
import { definePluginSettings } from "@api/Settings";

// Definiamo i settings grafici che appariranno su Discord
const settings = definePluginSettings({
    startTime: {
        type: OptionType.STRING,
        description: "Start time for the custom status (HH:MM format)",
        default: "09:30"
    },
    endTime: {
        type: OptionType.STRING,
        description: "End time for the custom status (HH:MM format)",
        default: "18:00"
    },
    activeStatus: {
        type: OptionType.SELECT,
        description: "Status to apply during the timeframe",
        default: "dnd",
        options: [
            { label: "Do Not Disturb", value: "dnd", default: true },
            { label: "Idle", value: "idle" },
            { label: "Invisible / Offline", value: "invisible" },
            { label: "Online", value: "online" }
        ]
    },
    defaultStatus: {
        type: OptionType.SELECT,
        description: "Status to apply outside the timeframe",
        default: "online",
        options: [
            { label: "Online", value: "online", default: true },
            { label: "Do Not Disturb", value: "dnd" },
            { label: "Idle", value: "idle" },
            { label: "Invisible / Offline", value: "invisible" }
        ]
    }
});

let checkInterval: NodeJS.Timeout | null = null;
let currentAppliedStatus = "";

async function checkAndSetStatus() {
    const now = new Date();
    const day = now.getDay();

    const currentMins = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = settings.store.startTime.split(":").map(Number);
    const [endH, endM] = settings.store.endTime.split(":").map(Number);

    const startMins = (startH * 60) + (startM || 0);
    const endMins = (endH * 60) + (endM || 0);

    const isWeekday = day >= 1 && day <= 5; // Da Lunedì a Venerdì
    const isInTimeframe = currentMins >= startMins && currentMins < endMins;

    // Determiniamo lo status in base all'orario e alle impostazioni dell'utente
    let targetStatus = settings.store.defaultStatus;

    if (isWeekday && isInTimeframe) {
        targetStatus = settings.store.activeStatus;
    }

    if (targetStatus !== currentAppliedStatus) {
        console.log(`[AutoStatus] Updating status via REST to: ${targetStatus.toUpperCase()}`);

        try {
            const token = (AuthenticationStore as any).getToken();

            if (!token) {
                console.error("[AutoStatus] Auth token not found.");
                return;
            }

            const response = await fetch("https://discord.com/api/v9/users/@me/settings", {
                method: "PATCH",
                headers: {
                    "Authorization": token,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ status: targetStatus })
            });

            if (response.ok) {
                console.log(`[AutoStatus] Success! Status set to: ${targetStatus}`);
                currentAppliedStatus = targetStatus;
            } else {
                console.error("[AutoStatus] API Error:", response.status);
            }
        } catch (error) {
            console.error("[AutoStatus] Network Error:", error);
        }
    }
}

export default definePlugin({
    name: "AutoStatus",
    description: "Automatically changes Discord status based on custom timeframes.",
    authors: [{ name: "Foxy_340", id: 769203660638388264n }],
    settings,

    start() {
        console.log("[AutoStatus] Plugin started.");
        checkAndSetStatus();
        checkInterval = setInterval(checkAndSetStatus, 60 * 1000);
    },

    stop() {
        if (checkInterval) {
            clearInterval(checkInterval);
            checkInterval = null;
        }
        console.log("[AutoStatus] Plugin stopped.");
    }
});