/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { PKCache, UpdateProfile } from "@plugins/discordKit/utils";
import { sendMessage } from "@utils/discord";
import { CommandContext } from "@vencord/discord-types";
import PKAPI from "pkapi.js";

export default async function (pkClient: PKAPI, cache: PKCache, ctx: CommandContext, args: Record<string, any>) {
    try {
        return await (
            args.mode ? mode(pkClient, cache, ctx, args) :
                args.member ? member(pkClient, cache, ctx, args) :
                    _default(pkClient, cache, ctx)
        );
    } catch (error) {
        console.error("PluralKit autoproxy error:", error);
        sendMessage(ctx.channel.id, { content: `❌ Autoproxy error: \`${(error as Error).message}\`` });
    }
}

async function mode(pkClient: PKAPI, cache: PKCache, ctx: CommandContext, args: Record<string, any>) {
    const autoproxy = cache.autoproxy.find(e => e.guild === (ctx.guild ? ctx.guild.id : "0"));

    try {
        const guild = ctx.guild ? ctx.guild.id : "0";
        const req = await pkClient.patchSystemAutoproxySettings({ guild: guild, autoproxy_member: null, autoproxy_mode: args.mode, token: cache.token() });
        if (autoproxy === undefined) cache.autoproxy.push(req);
        else if (req !== autoproxy) cache.autoproxy[cache.autoproxy.findIndex(e => e.guild === guild)] = req;
        else return { content: `Autoproxy already set to ${req.autoproxy_mode} mode` };

        switch (args.mode) {
            case "off":
                const update = await UpdateProfile({
                    "bio": cache.system.description,
                    "global_name": cache.system.name,
                    "banner_color": `#${cache.system.color || ""}`
                }).then(r => r).catch(e => { throw e; });
                console.log(update);
                break;
        }

        return { content: `Autoproxy set to ${req.autoproxy_mode} mode` };
    } catch (error) {
        throw error;
    }
}

async function member(pkClient: PKAPI, cache: PKCache, ctx: CommandContext, args: Record<string, any>) {
    const autoproxy = cache.autoproxy.find(e => e.guild === (ctx.guild ? ctx.guild.id : "0"));
    let member;

    try {
        member = ([...cache.system.members].find(e => e[1].name === args.member || e[1].id === args.member))[1];
    } catch (error) {
        throw error;
    }

    console.log(member);

    try {
        const guild = ctx.guild ? ctx.guild.id : "0";
        const req = await pkClient.patchSystemAutoproxySettings({ guild: guild, autoproxy_member: member.id, autoproxy_mode: "member", token: cache.token() });
        if (autoproxy === undefined) cache.autoproxy.push(req);
        else if (req !== autoproxy) cache.autoproxy[cache.autoproxy.findIndex(e => e.guild === guild)] = req;
        else return { content: `Autoproxy already set to ${member.name}` };

        const update = await UpdateProfile({
            "bio": member.description,
            "global_name": member.name,
            "banner_color": `#${member.color || ""}`
        }).then(r => { content: `Autoproxy set to ${member.name} (${member.id})`; }).catch(e => { throw { content: e.message }; });

        return update;
    } catch (error) {
        throw error;
    }
}

async function _default(pkClient: PKAPI, cache: PKCache, ctx: CommandContext) {
    if (ctx.guild !== undefined) {
        if (cache.autoproxy?.find(e => e.guild === ctx.guild?.id) === undefined) {
            try {
                cache.autoproxy?.push(await pkClient.getSystemAutoproxySettings({ guild: ctx.guild.id, token: cache.token() }));
                if (cache.autoproxy?.find(e => e.guild === ctx.guild?.id) === undefined)
                    throw new Error(`Failed to create autoproxy cache for guild \`${ctx.guild?.id}\``);
            } catch (error) {
                throw error;
            }
        }

        const data = cache.autoproxy.find(e => e.guild === ctx.guild?.id);
        return {
            content: [
                `__Autoproxy settings for ${ctx.guild.name}__`,
                data?.autoproxy_member ? `Member: ${data.autoproxy_member}` : "",
                `Mode: ${data?.autoproxy_mode}`,
                data?.last_latch_timestamp ? `Last latch timestamp: ${data.last_latch_timestamp}` : ""
            ].join("\n").replaceAll("\n\n", "\n")
        };
    } else {
        const data = cache.autoproxy.find(e => e.guild === "0");
        return {
            content: [
                "__Autoproxy settings for DMs__",
                data?.autoproxy_member ? `Member: ${data.autoproxy_member}` : "",
                `Mode: ${data?.autoproxy_mode}`,
                data?.last_latch_timestamp ? `Last latch timestamp: ${data.last_latch_timestamp}` : ""
            ].join("\n").replaceAll("\n\n", "\n")
        };
    }
}
