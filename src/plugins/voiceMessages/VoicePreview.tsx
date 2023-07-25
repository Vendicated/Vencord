/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { LazyComponent, useForceUpdater } from "@utils/react";
import { findByCode } from "@webpack";
import { useEffect, useState } from "@webpack/common";

import { cl } from "./utils";

interface VoiceMessageProps {
    src: string;
    waveform: string;
}
const VoiceMessage = LazyComponent<VoiceMessageProps>(() => findByCode('["onVolumeChange","volume","onMute"]'));

export type VoicePreviewOptions = {
    src?: string;
    waveform: string;
    recording?: boolean;
};
export const VoicePreview = ({
    src,
    waveform,
    recording,
}: VoicePreviewOptions) => {
    const update = useForceUpdater();
    const [recordingStart, setRecordingStart] = useState(0);

    const now = Date.now();
    const durationMs = now - (recording ? recordingStart : now);
    const durationSeconds = Math.floor(durationMs / 1000);
    const durationDisplay = Math.floor(durationSeconds / 60) + ":" + (durationSeconds % 60).toString().padStart(2, "0");

    useEffect(() => {
        if (!recording) return;

        setRecordingStart(now);
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [recording]);

    if (src && !recording) return <VoiceMessage key={src} src={src} waveform={waveform} />;
    return (
        <div className={cl("preview", recording ? "preview-recording" : [])}>
            <div className={cl("preview-indicator")}></div>
            <div className={cl("preview-time")}>{durationDisplay}</div>
            <div className={cl("preview-label")}>{recording ? "RECORDING" : "----"}</div>
        </div>
    );
};
