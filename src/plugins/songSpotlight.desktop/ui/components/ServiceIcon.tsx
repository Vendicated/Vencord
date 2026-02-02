/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { cl } from "@plugins/songSpotlight.desktop/lib/utils";
import { AppleMusicIcon, SoundCloudIcon, SpotifyIcon } from "@plugins/songSpotlight.desktop/ui/common";
import { Tooltip, useMemo } from "@webpack/common";
import { JSX } from "react";

const serviceMap = {
    spotify: {
        title: "Spotify",
        Icon: SpotifyIcon,
    },
    applemusic: {
        title: "Apple Music",
        Icon: AppleMusicIcon,
    },
    soundcloud: {
        title: "Soundcloud",
        Icon: SoundCloudIcon,
    },
};

interface ServiceIconProps extends SvgProps {
    service: string;
}
type SvgProps = JSX.IntrinsicElements["svg"];

export function ServiceIcon({ service, width, height, ...props }: ServiceIconProps) {
    const info: { title: string; Icon: typeof SpotifyIcon; } = useMemo(() => serviceMap[service], [service]);

    return info && (
        <Tooltip text={info.title}>
            {tooltipProps => (
                <info.Icon
                    {...tooltipProps}
                    {...props}
                    className={cl("icon")}
                    width={width ?? 20}
                    height={height ?? 20}
                />
            )}
        </Tooltip>
    );
}
