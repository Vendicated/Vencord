/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useMemo, useState } from "@webpack/common";
import { JSX, RefObject } from "react";

interface ProgressCircleProps extends SvgProps {
    border: number;
    audioRef: RefObject<HTMLAudioElement | undefined>;
}
type SvgProps = JSX.IntrinsicElements["svg"];

export function ProgressCircle({ border, audioRef, ...props }: ProgressCircleProps) {
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
            const audio = audioRef.current;
            if (audio && !Number.isNaN(audio.duration) && !audio.paused) {
                setProgress(audio.currentTime / audio.duration);
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
