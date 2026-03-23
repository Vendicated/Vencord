/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { HeaderBarButton } from "@api/HeaderBar";
import { ChannelStore, SelectedChannelStore, useStateFromStores } from "@webpack/common";

import { cl } from "../utils";
import { openVoiceChannelLog } from "./VoiceChannelLogModal";

function LogIcon({ height = 24, width = 24 }: { height?: number; width?: number; }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14 2v6h6M8 13h8M8 17h8M8 9h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

export function OpenLogsButton() {
    const voiceChannelId = useStateFromStores([SelectedChannelStore], () => SelectedChannelStore.getVoiceChannelId());

    if (!voiceChannelId) return null;

    const channel = ChannelStore.getChannel(voiceChannelId);
    if (!channel) return null;

    return (
        <HeaderBarButton
            className={cl("toolbar-btn")}
            onClick={() => openVoiceChannelLog(channel)}
            tooltip="Voice Channel Logs"
            icon={LogIcon}
        />
    );
}

export { LogIcon };
