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

import { findByCodeLazy } from "@webpack";
import { useEffect, useState } from "@webpack/common";
import { ComponentType } from "react";

import { cl } from "./utils";

type VoiceMessage = ComponentType<{
    src: string;
    waveform: string;
}>;
const VoiceMessage: VoiceMessage = findByCodeLazy('["onVolumeChange","volume","onMute"]');

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
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
        if (!recording) return;

        const interval = setInterval(() => {
            setSeconds(s => s + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [recording]);

    const duration = Math.floor(seconds / 60) + ":" + (seconds % 60).toString().padStart(2, "0");

    if (src && !recording) return <VoiceMessage key={src} src={src} waveform={waveform} />;
    return <div className={cl("preview", recording ? "preview-recording" : [])}>
        <div className={cl("preview-indicator")}></div>
        <div className={cl("preview-time")}>{duration}</div>
        <div className={cl("preview-label")}>{recording ? "RECORDING" : "----"}</div>
    </div>;
};
