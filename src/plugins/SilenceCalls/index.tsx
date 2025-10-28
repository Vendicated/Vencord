/*
 * SilenceCalls plugin
 * Enables streamer mode automatically for the duration of a voice call when the user activates the plugin
 */

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { Devs } from "@utils/constants";
import definePlugin, { ReporterTestable } from "@utils/types";
import { FluxDispatcher, React, StreamerModeStore } from "@webpack/common";

let timer: ReturnType<typeof setTimeout> | null = null;

function setStreamerMode(value: boolean) {
    try {
        FluxDispatcher.dispatch({
            type: "STREAMER_MODE_UPDATE",
            key: "enabled",
            value
        });
    } catch (e) {
        // ignore
    }
}

type StreamerSettings = Partial<{
    disableNotifications: boolean;
    disableSounds: boolean;
    enableContentProtection: boolean;
    hideInstantInvites: boolean;
    hidePersonalInformation: boolean;
    autoToggle: boolean;
}>;

// We don't capture previous settings reliably. On deactivate we'll enable all protections.

function applyStreamerSettings(settings: StreamerSettings) {
    try {
        for (const [k, v] of Object.entries(settings)) {
            FluxDispatcher.dispatch({
                type: "STREAMER_MODE_UPDATE",
                key: k,
                value: v
            });
        }
    } catch (e) {
        // ignore
    }
}

const SilenceButton: ChatBarButtonFactory = ({ isMainChat }) => {
    const [active, setActive] = React.useState(false);

    if (!isMainChat) return null;

    const onClick = () => {
        if (active) {
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
            setStreamerMode(false);
            try {
                applyStreamerSettings({
                    disableNotifications: true,
                    disableSounds: true,
                    enableContentProtection: true,
                    hideInstantInvites: true,
                    hidePersonalInformation: true,
                    autoToggle: false
                });
            } catch { }
            setActive(false);
            return;
        }

        if (timer) {
            clearTimeout(timer);
            timer = null;
        }

        applyStreamerSettings({
            disableNotifications: false,
            disableSounds: true,
            enableContentProtection: false,
            hideInstantInvites: false,
            hidePersonalInformation: false
        });

        setStreamerMode(true);
        setActive(true);

        timer = setTimeout(() => {
            setStreamerMode(false);
            try {
                applyStreamerSettings({
                    disableNotifications: true,
                    disableSounds: true,
                    enableContentProtection: false,
                    hideInstantInvites: true,
                    hidePersonalInformation: true,
                    autoToggle: true
                });
            } catch { }
            setActive(false);
            timer = null;
        }, 15000);
    };

    return (
        <ChatBarButton
            tooltip={active ? "SilenceCalls" : "SilenceCalls"}
            onClick={onClick}
        >
            <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={{ scale: "1.15" }}>
                <path fill="currentColor" d="M12 22c1.1 0 2-.9 2-2H10c0 1.1.9 2 2 2zm6-6V11c0-3.07-1.63-5.64-4.5-6.32V4a1.5 1.5 0 0 0-3 0v.68C7.63 5.36 6 7.92 6 11v5l-1.99 2H19.99L18 16z" />
                {active && (
                    <path d="M4 4 L20 20" stroke="var(--status-danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                )}
            </svg>
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "SilenceCalls",
    description: "Adds a bell icon in the chat bar that lets you silence a call.",
    authors: [Devs.yonn2222],
    reporterTestable: ReporterTestable.None,

    renderChatBarButton: SilenceButton
});
