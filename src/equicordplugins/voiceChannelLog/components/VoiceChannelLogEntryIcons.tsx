/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classes } from "@utils/misc";
import { React } from "@webpack/common";
import { Channel } from "discord-types/general";

import { cl } from "..";
import { VoiceChannelLogEntry } from "../logs";

export default function Icon({ logEntry, channel, className }: { logEntry: VoiceChannelLogEntry; channel: Channel; className: string; }) {
    // Taken from /assets/7378a83d74ce97d83380.svg
    const Join = <svg xmlns="http://www.w3.org/2000/svg" height="18" width="18"><g fill="none" fill-rule="evenodd"><path d="m18 0h-18v18h18z" /><path d="m0 8h14.2l-3.6-3.6 1.4-1.4 6 6-6 6-1.4-1.4 3.6-3.6h-14.2" fill="#3ba55c" /></g></svg>;
    // Taken from /assets/192510ade1abc3149b46.svg
    const Leave = <svg xmlns="http://www.w3.org/2000/svg" height="18" width="18" ><g fill="none" fill-rule="evenodd"><path d="m18 0h-18v18h18z" /><path d="m3.8 8 3.6-3.6-1.4-1.4-6 6 6 6 1.4-1.4-3.6-3.6h14.2v-2" fill="#ed4245" /></g></svg>;
    // For other contributors, please DO make specific designs for these instead of how I just copied the join/leave icons and making them orange
    const MovedTo = <svg xmlns="http://www.w3.org/2000/svg" height="18" width="18"><g fill="none" fill-rule="evenodd"><path d="m18 0h-18v18h18z" /><path d="m3.8 8 3.6-3.6-1.4-1.4-6 6 6 6 1.4-1.4-3.6-3.6h14.2v-2" fill="#faa61a" /></g></svg>;
    const MovedFrom = <svg xmlns="http://www.w3.org/2000/svg" height="18" width="18"><g fill="none" fill-rule="evenodd"><path d="m18 0h-18v18h18z" /><path d="m0 8h14.2l-3.6-3.6 1.4-1.4 6 6-6 6-1.4-1.4 3.6-3.6h-14.2" fill="#faa61a" /></g></svg>;

    if (logEntry.newChannel && !logEntry.oldChannel) return React.cloneElement(Join, { className: classes(className, cl("join")) });
    if (!logEntry.newChannel && logEntry.oldChannel) return React.cloneElement(Leave, { className: classes(className, cl("leave")) });
    if (logEntry.newChannel === channel.id && logEntry.oldChannel) return React.cloneElement(MovedFrom, { className: classes(className, cl("moved-from")) });
    if (logEntry.newChannel && logEntry.oldChannel === channel.id) return React.cloneElement(MovedTo, { className: classes(className, cl("moved-to")) });
    // we should never get here, this is just here to shut up the type checker
    return <svg></svg>;
}
