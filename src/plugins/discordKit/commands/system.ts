/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { PKCache } from "@plugins/discordKit/utils";
import { CommandReturnValue } from "@vencord/discord-types";
import PKAPI, { SystemFetchOptions } from "pkapi.js";

export default async function (pkClient: PKAPI, cache: PKCache, args: Record<string, any>): Promise<CommandReturnValue> {
    if (!cache.isReady) return { content: "DiscordKit is not ready." };

    const id = args.id === undefined ? "@me" :
        args.id.startsWith("<@") ? args.id.replace(/[<@>]/g, "") : args.id;
    const token = id === "@me" ? cache.token() : undefined;
    const fetch = [id === "@me" ? "config" : "", "fronters", "group members", "groups", "members", "switches"];

    try {
        const system_temp = Object.entries(id === "@me" || id === cache.userId ?
            cache.system : await pkClient.getSystem({ system: id, fetch: fetch as SystemFetchOptions[], token })
        ).filter(v => v[1] !== null && v[1] !== undefined); // Required because API throws both types

        const system: Array<[string, any]> = [];
        const contentLines: string[] = [];

        system_temp.forEach(v => {
            if (!["config", "privacy", "uuid"].includes(v[0])) {
                let key: string = v[0];
                let value: any = v[1];

                switch (key) {
                    case "avatar_url":
                        key = "Avatar URL";
                        value = value.replace("size=512", "size=256");
                        break;
                    case "created":
                        key = "Created";
                        value = (v[1] as Date).toUTCString().replace("GMT", "UTC");
                        break;
                    case "id":
                        key = "ID";
                        break;
                    case "groups":
                    case "switches":
                    case "members":
                        key = `${v[0].slice(0, 1).toUpperCase()}${v[0].slice(1)}`;
                        value = value?.size ? `${value.size} (see \`/${v[0]}\` to list)` : "0";
                        break;
                    case "description":
                        key = `${v[0].slice(0, 1).toUpperCase()}${v[0].slice(1)}`;
                        value = `\n> ${value.replaceAll("\n", "\n> ")}`;
                        break;
                    default:
                        key = `${v[0].slice(0, 1).toUpperCase()}${v[0].slice(1)}`;
                        break;
                }

                if (value !== "0")
                    system.push([key, value]);
            }
        });

        ["Pronouns", "Description", "Name", "ID"].forEach(k => {
            if (system.findIndex(e => e[0] === k) !== -1)
                system.unshift(system.splice(system.findIndex(e => e[0] === k), 1)[0]);
        });

        ["Avatar URL", "Created"].forEach(k => {
            if (system.findIndex(e => e[0] === k) !== -1)
                system.push(system.splice(system.findIndex(e => e[0] === k), 1)[0]);
        });

        system.forEach(e => {
            switch (e[0]) {
                case "ID":
                    contentLines.push(`### System: \`${e[1]}\``);
                    break;
                case "Avatar URL":
                    contentLines.push(`-# [System Avatar](${e[1]})`);
                    break;
                case "Created":
                    contentLines.push(`-# Created: ${e[1]}`);
                    break;
                default:
                    contentLines.push(`**${e[0]}:** ${e[1]}`);
                    break;
            }
        });

        return { content: contentLines.join("\n") };
    } catch (error) {
        return { content: (error as Error).message };
    }
}
