/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { cl } from "@plugins/songSpotlight.desktop/lib/utils";
import { AppleMusicIcon, SoundcloudIcon, SpotifyIcon } from "@plugins/songSpotlight.desktop/ui/common";
import { getServiceLabel } from "@song-spotlight/api/util";
import { Tooltip, useMemo } from "@webpack/common";
import { JSX } from "react";

const serviceIcons = {
    applemusic: AppleMusicIcon,
    soundcloud: SoundcloudIcon,
    spotify: SpotifyIcon,
};

interface ServiceIconProps extends SvgProps {
    service: string;
}
type SvgProps = JSX.IntrinsicElements["svg"];

export function ServiceIcon({ service, width, height, ...props }: ServiceIconProps) {
    const Icon: typeof SpotifyIcon = useMemo(() => serviceIcons[service], [service]);
    const label = useMemo(() => getServiceLabel(service), [service]);

    return Icon && label && (
        <Tooltip text={label}>
            {tooltipProps => (
                <Icon
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
