/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ActivityType } from ".";

interface PresetsType {
    appName: string,
    details?: string,
    state?: string,
    type: ActivityType,
    imageBig: string,
    imageBigTooltip?: string,
    imageSmall?: string,
    imageSmallTooltip?: string,
    buttonOneText?: string,
    buttonOneURL?: string,
    buttonTwoText?: string,
    buttonTwoURL?: string;
}

const Presets: Record<string, PresetsType> = {
    Vencord: {
        appName: "Vencord",
        details: "The cutest discord client mod",
        type: ActivityType.PLAYING,
        imageBig: "https://vencord.dev/assets/favicon.png",
        buttonOneText: "Download",
        buttonOneURL: "https://vencord.dev/"
    },
    VSCode: {
        appName: "VSCode",
        details: "Idling",
        type: ActivityType.PLAYING,
        imageBig: "https://raw.githubusercontent.com/LeonardSSH/vscord/main/assets/icons/idle-vscode.png",
        imageBigTooltip: "Idling",
        imageSmall: "https://raw.githubusercontent.com/LeonardSSH/vscord/main/assets/icons/idle.png",
        imageSmallTooltip: "zZz",
        buttonOneText: "View Repository",
        buttonOneURL: "https://github.com/vendicated/vencord"
    },
    Anime: {
        appName: "Anime",
        details: "Episode 01",
        type: ActivityType.WATCHING,
        imageBig: "https://i.pinimg.com/564x/65/ec/ac/65ecacb6aa2281c70a6733b37c750bc7.jpg",
    }
};

export default Presets;
export { PresetsType };
