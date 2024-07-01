/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// uhh... can i put this in Icons.tsx?
import { Tooltip } from "@webpack/common";

type IconProps = {
    tooltip?: string,
    paths: { fill: string, path: string }[]
    viewBox?: string
}

function Icon(iconProps: IconProps) {
    return (
        <Tooltip text={iconProps.tooltip??""}>
            {props => (
                <svg aria-hidden="true" role="img" width="1em" height="1em"
                    {...props}
                    fill="none" viewBox={iconProps.viewBox??"0 0 24 24"}>
                    {iconProps.paths.map(path => (
                        <path fill={path.fill} d={path.path} />
                    ))}
                </svg>
            )}
        </Tooltip>

    );
}

export function FriendIcon() {
    return (
        <Icon tooltip={"Friend"} paths={[
            { fill: "currentColor", path: "M13 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" },
            { fill: "currentColor", path: "M3 5v-.75C3 3.56 3.56 3 4.25 3s1.24.56 1.33 1.25C6.12 8.65 9.46 12 13 12h1a8 8 0 0 1 8 8 2 2 0 0 1-2 2 .21.21 0 0 1-.2-.15 7.65 7.65 0 0 0-1.32-2.3c-.15-.2-.42-.06-.39.17l.25 2c.02.15-.1.28-.25.28H9a2 2 0 0 1-2-2v-2.22c0-1.57-.67-3.05-1.53-4.37A15.85 15.85 0 0 1 3 5Z" }
        ]}/>
    );
}

export function BlockedIcon() {
    return (
        <Icon tooltip={"Blocked"} paths={[
            { fill: "#a32e2e", path: "M367.2 412.5L99.5 144.8C77.1" +
                    " 176.1 64 214.5 64 256c0 106 86 192 192 192c41.5 0 79.9-13.1 111.2-35.5m45.3-45.3C434.9 335.9 448 297.5 448 256c0-106-86-192-192-192c-41.5 0-79.9 13.1-111.2 35.5zM0 256a256 256 0 1 1 512 0a256 256 0 1 1-512 0" }
        ]} viewBox={"0 0 512 512"}/>
    );
}
