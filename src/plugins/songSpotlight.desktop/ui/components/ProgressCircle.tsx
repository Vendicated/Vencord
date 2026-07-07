/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { RenderInfoEntry } from "@song-spotlight/api/handlers";
import { useEffect, useMemo, useState } from "@webpack/common";
import { JSX, RefObject } from "react";

interface ProgressCircleProps extends SvgProps {
    border: number;
    audioRef: RefObject<HTMLAudioElement | undefined>;
    playingRef: RefObject<RenderInfoEntry | undefined>;
}
type SvgProps = JSX.IntrinsicElements["svg"];

export default function ProgressCircle({ border, audioRef, playingRef, ...props }: ProgressCircleProps) {
    const { radius, stroke, circumference } = useMemo(() => {
        const radius = 50 - border * 2;
        return {
            radius,
            stroke: border * 2,
            circumference: Math.PI * 2 * radius,
        };
    }, [border]);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        let handle = requestAnimationFrame(function update() {
            const audio = audioRef.current, playing = playingRef.current?.audio;
            if (audio && playing && !Number.isNaN(audio.duration) && !audio.paused) {
                let preg = audio.currentTime / audio.duration;
                if (playing.previewStart !== undefined && playing.previewSlice) {
                    const start = playing.previewStart / 1e3, slice = playing.previewSlice / 1e3;
                    preg = (audio.currentTime - start) / slice;
                }
                setProgress(Math.min(Math.max(preg, 0), 1));
            } else {
                setProgress(0);
            }

            handle = requestAnimationFrame(update);
        });

        return () => cancelAnimationFrame(handle);
    }, [audioRef]);

    return (
        <svg
            {...props}
            viewBox="0 0 100 100"
        >
            <circle
                cx={50}
                cy={50}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={stroke}
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress)}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                data-empty={progress === 0}
            />
        </svg>
    );
}
