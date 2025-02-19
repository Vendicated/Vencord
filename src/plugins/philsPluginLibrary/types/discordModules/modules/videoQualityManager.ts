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

import { Bitrate, Framerate, Resolution } from "../../";
import { Connection } from "./";

export type VideoQualityManager = VideoQualityManager_ & {
    connection: Connection;
    contextType: string;
    isMuted: boolean;
    isStreamContext: boolean;
    ladder: Ladder;
    options: Options;
    qualityOverwrite: QualityOverwrite;
    __proto__: VideoQualityManager_;
};

export interface VideoQualityManager_ {
    applyQualityConstraints: (...args: any[]) => any;
    getDesktopQuality: (...args: any[]) => any;
    getQuality: (...args: any[]) => any;
    getVideoQuality: (...args: any[]) => any;
    setQuality: (...args: any[]) => any;
}

export interface QualityOverwrite {
    bitrateMax?: number;
    bitrateMin?: number;
    bitrateTarget?: number;
    capture?: Resolution & Framerate;
    encode?: Resolution & Framerate;
}

export interface Options {
    videoBudget: VideoBudget;
    videoCapture: VideoBudget;
    videoBitrate: VideoBitrate;
    desktopBitrate: DesktopBitrate;
    videoBitrateFloor: number;
}

export type DesktopBitrate = Bitrate;

export type VideoBitrate = Omit<Bitrate, "target">;

export type VideoBudget = Resolution & Framerate;

export interface Ladder {
    pixelBudget: number;
    ladder: {
        [key: number]: LadderValue;
    };
    orderedLadder: OrderedLadder[];
}

export interface OrderedLadder extends Resolution, Framerate {
    pixelCount: number;
    wantValue: number;
    budgetPortion: number;
    mutedFramerate: Framerate;
}

export interface LadderValue extends Resolution, Framerate {
    budgetPortion: number;
    mutedFramerate: Framerate;
}
