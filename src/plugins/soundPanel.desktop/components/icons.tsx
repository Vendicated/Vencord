/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 cegged
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ReactNode } from "react";

export interface IconProps {
    className?: string;
    size?: number;
}

const line = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const REPEAT_ARROWS = "M17 2.5l3 3-3 3M4 11.5v-1a5 5 0 0 1 5-5h11M7 21.5l-3-3 3-3M20 12.5v1a5 5 0 0 1-5 5H4";
const TRAY = "M4 15v2.5A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5V15";

function Svg({ className, size = 20, children }: IconProps & { children: ReactNode; }) {
    return (
        <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            {children}
        </svg>
    );
}

export const SoundPanelIcon = (props: IconProps) => (
    <Svg {...props}>
        <path {...line} d="M6 4v16M12 4v16M18 4v16" />
        <rect x="3" y="12" width="6" height="5" rx="2" />
        <rect x="9" y="6" width="6" height="5" rx="2" />
        <rect x="15" y="10" width="6" height="5" rx="2" />
    </Svg>
);

export const SoundboardIcon = (props: IconProps) => (
    <Svg {...props}>
        <rect x="3" y="3" width="8" height="8" rx="2.5" />
        <rect x="13" y="3" width="8" height="8" rx="2.5" />
        <rect x="3" y="13" width="8" height="8" rx="2.5" />
        <circle cx="17" cy="17" r="4" />
    </Svg>
);

export const WaveformIcon = (props: IconProps) => (
    <Svg {...props}>
        <path {...line} d="M4 10v4M8 6.5v11M12 3.5v17M16 8v8M20 10.5v3" />
    </Svg>
);

export const MusicNoteIcon = (props: IconProps) => (
    <Svg {...props}>
        <circle cx="6.5" cy="17.5" r="3" />
        <circle cx="16.5" cy="15.5" r="3" />
        <path d="M7.5 17.5V7.2q0-1.2 1.2-1.45l9.6-2q1.2-.25 1.2.95v10.8h-2V6.72l-8 1.66v9.12Z" />
    </Svg>
);

export const PlayIcon = (props: IconProps) => (
    <Svg {...props}>
        <path d="M7.54 4.43 18.46 11.07q1.54.93 0 1.86L7.54 19.57Q6 20.5 6 18.7V5.3q0-1.8 1.54-.87Z" />
    </Svg>
);

export const PauseIcon = (props: IconProps) => (
    <Svg {...props}>
        <rect x="5.5" y="4" width="4.5" height="16" rx="1.5" />
        <rect x="14" y="4" width="4.5" height="16" rx="1.5" />
    </Svg>
);

export const StopIcon = (props: IconProps) => (
    <Svg {...props}>
        <rect x="5" y="5" width="14" height="14" rx="3" />
    </Svg>
);

export const NextIcon = (props: IconProps) => (
    <Svg {...props}>
        <path d="M5.32 5.4 13.68 11.1q1.32.9 0 1.8L5.32 18.6Q4 19.5 4 17.9V6.1q0-1.6 1.32-.7Z" />
        <rect x="17" y="4.5" width="3" height="15" rx="1.5" />
    </Svg>
);

export const PreviousIcon = (props: IconProps) => (
    <Svg {...props}>
        <path d="M18.68 5.4 10.32 11.1q-1.32.9 0 1.8l8.36 5.7q1.32.9 1.32-.7V6.1q0-1.6-1.32-.7Z" />
        <rect x="4" y="4.5" width="3" height="15" rx="1.5" />
    </Svg>
);

export const ShuffleIcon = (props: IconProps) => (
    <Svg {...props}>
        <path {...line} d="M3 17h2.6a4.4 4.4 0 0 0 3.5-1.8l4.8-6.4A4.4 4.4 0 0 1 17.4 7H21M18 4l3 3-3 3M3 7h2.6c1.1 0 2.2.4 3 1.2M21 17h-3.6c-1.1 0-2.2-.4-3-1.2M18 14l3 3-3 3" />
    </Svg>
);

export const RepeatIcon = (props: IconProps) => (
    <Svg {...props}>
        <path {...line} d={REPEAT_ARROWS} />
    </Svg>
);

export const RepeatOneIcon = (props: IconProps) => (
    <Svg {...props}>
        <path {...line} d={REPEAT_ARROWS} />
        <path {...line} d="M11 10.6 12.5 9.5v5.5" />
    </Svg>
);

export const SpeakerIcon = (props: IconProps) => (
    <Svg {...props}>
        <path d="M11 4.7a1 1 0 0 0-1.65-.76L5.6 7.2H4a2 2 0 0 0-2 2v5.6a2 2 0 0 0 2 2h1.6l3.75 3.26A1 1 0 0 0 11 19.3Z" />
        <path {...line} d="M15 9.2a4 4 0 0 1 0 5.6M17.8 6.4a8 8 0 0 1 0 11.2" />
    </Svg>
);

export const HeadphonesIcon = (props: IconProps) => (
    <Svg {...props}>
        <path {...line} d="M4 15v-3a8 8 0 0 1 16 0v3" />
        <rect x="2.5" y="13" width="6" height="8.5" rx="2.5" />
        <rect x="15.5" y="13" width="6" height="8.5" rx="2.5" />
    </Svg>
);

export const MicIcon = (props: IconProps) => (
    <Svg {...props}>
        <rect x="8.5" y="2.5" width="7" height="12" rx="3.5" />
        <path {...line} d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6" />
    </Svg>
);

export const MicOffIcon = (props: IconProps) => (
    <Svg {...props}>
        <path {...line} d="M15.5 9.5V6a3.5 3.5 0 0 0-6.6-1.6M8.5 9v2a3.5 3.5 0 0 0 5.9 2.55M5.5 11a6.5 6.5 0 0 0 10.4 5.2M18.5 11a6.5 6.5 0 0 1-.5 2.5M12 17.5V21M9 21h6M4 4l16 16" />
    </Svg>
);

export const TransparencyIcon = (props: IconProps) => (
    <Svg {...props}>
        <circle {...line} cx="12" cy="12" r="8.5" />
        <path d="M12 3.5a8.5 8.5 0 0 0 0 17Z" />
    </Svg>
);

export const StarIcon = (props: IconProps) => (
    <Svg {...props}>
        <path
            stroke="currentColor"
            strokeWidth={2}
            strokeLinejoin="round"
            d="M12 3.5l2.6 5.27 5.82.85-4.21 4.1.99 5.8L12 16.78l-5.2 2.74.99-5.8-4.21-4.1 5.82-.85Z"
        />
    </Svg>
);

export const JoinSoundIcon = (props: IconProps) => (
    <Svg {...props}>
        <path {...line} d="M14 4h3.5A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5H14M4 12h11M11 8l4 4-4 4" />
    </Svg>
);

export const UploadIcon = (props: IconProps) => (
    <Svg {...props}>
        <path {...line} d={`M12 15V4M7.5 8.5 12 4l4.5 4.5${TRAY}`} />
    </Svg>
);

export const SaveIcon = (props: IconProps) => (
    <Svg {...props}>
        <path {...line} d={`M12 4v11M7.5 10.5 12 15l4.5-4.5${TRAY}`} />
    </Svg>
);
