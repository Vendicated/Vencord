import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Menu, GuildStore, ChannelStore, RestAPI, GuildChannelStore, GuildRoleStore, Toasts } from "@webpack/common";

let copiedGuildData: any = null;

async function copyAndPasteGuild(guildId: string) {
    const guild = GuildStore.getGuild(guildId);
    if (!guild) return;

    Toasts.show({
        message: `Copying ${guild.name} in progress... Please wait and do not do anything!`,
        type: Toasts.Type.MESSAGE,
        id: "guild-copy-progress"
    });

    const channelIds = GuildChannelStore.getChannels(guildId, true);
    const channels: any[] = [];

    if (channelIds) {
        Object.values(channelIds).forEach((category: any) => {
            if (Array.isArray(category)) {
                category.forEach((channelData: any) => {
                    const channel = ChannelStore.getChannel(channelData.channel.id);
                    if (channel) channels.push(channel);
                });
            }
        });
    }

    channels.sort((a: any, b: any) => a.position - b.position);

    const sortedRoles = GuildRoleStore.getSortedRoles(guildId);

    copiedGuildData = {
        name: guild.name,
        icon: guild.icon,
        channels: channels.map((c: any) => ({
            id: c.id,
            name: c.name,
            type: c.type,
            position: c.position,
            parent_id: c.parent_id,
            topic: c.topic,
            nsfw: c.nsfw,
            bitrate: c.bitrate,
            user_limit: c.userLimit,
            rate_limit_per_user: c.rateLimitPerUser,
            permission_overwrites: c.permissionOverwrites
        })),
        roles: sortedRoles ? sortedRoles.map((r: any) => ({
            id: r.id,
            name: r.name,
            color: r.color,
            hoist: r.hoist,
            position: r.position,
            permissions: r.permissions,
            mentionable: r.mentionable
        })) : []
    };


    await pasteGuild(guild.name);
}

async function pasteGuild(guildName: string) {
    if (!copiedGuildData) {
        return;
    }

    try {
        const newGuild = await RestAPI.post({
            url: "/guilds",
            body: {
                name: copiedGuildData.name + " (Copie)",
                icon: copiedGuildData.icon,
                channels: []
            }
        });

        const guildId = newGuild.body.id;

        await new Promise(resolve => setTimeout(resolve, 2000));

        const defaultChannels = GuildChannelStore.getChannels(guildId);
        if (defaultChannels) {
            for (const category of Object.values(defaultChannels)) {
                if (Array.isArray(category)) {
                    for (const channelData of category) {
                        try {
                            await RestAPI.del({
                                url: `/channels/${channelData.channel.id}`
                            });
                            await new Promise(resolve => setTimeout(resolve, 300));
                        } catch (e) {
                        }
                    }
                }
            }
        }

        await new Promise(resolve => setTimeout(resolve, 1000));

        const roleMap = new Map();
        const everyoneRole = copiedGuildData.roles.find((r: any) => r.name === "@everyone");
        if (everyoneRole) {
            roleMap.set(everyoneRole.id, guildId);
        }

        for (const role of copiedGuildData.roles) {
            if (role.name === "@everyone") continue;

            try {
                const newRole = await RestAPI.post({
                    url: `/guilds/${guildId}/roles`,
                    body: {
                        name: role.name,
                        color: role.color,
                        hoist: role.hoist,
                        permissions: role.permissions,
                        mentionable: role.mentionable
                    }
                });
                roleMap.set(role.id, newRole.body.id);
                await new Promise(resolve => setTimeout(resolve, 600));
            } catch (e) {
            }
        }

        const channelMap = new Map();
        const categories = copiedGuildData.channels.filter((c: any) => c.type === 4);

        for (const category of categories) {
            try {
                const permissionOverwrites = category.permission_overwrites ?
                    Object.values(category.permission_overwrites).map((perm: any) => {
                        const newId = perm.type === 0 ? (roleMap.get(perm.id) || perm.id) : perm.id;
                        return {
                            id: newId,
                            type: perm.type,
                            allow: perm.allow,
                            deny: perm.deny
                        };
                    }) : [];

                const newChannel = await RestAPI.post({
                    url: `/guilds/${guildId}/channels`,
                    body: {
                        name: category.name,
                        type: category.type,
                        position: category.position,
                        permission_overwrites: permissionOverwrites
                    }
                });
                channelMap.set(category.id, newChannel.body.id);
                await new Promise(resolve => setTimeout(resolve, 600));
            } catch (e) {
            }
        }

        const otherChannels = copiedGuildData.channels.filter((c: any) => c.type !== 4);

        for (const channel of otherChannels) {
            try {
                const permissionOverwrites = channel.permission_overwrites ?
                    Object.values(channel.permission_overwrites).map((perm: any) => {
                        const newId = perm.type === 0 ? (roleMap.get(perm.id) || perm.id) : perm.id;
                        return {
                            id: newId,
                            type: perm.type,
                            allow: perm.allow,
                            deny: perm.deny
                        };
                    }) : [];

                let channelType = channel.type;
                if (channel.type === 5) channelType = 0;
                if (channel.type === 13) channelType = 2;

                await RestAPI.post({
                    url: `/guilds/${guildId}/channels`,
                    body: {
                        name: channel.name,
                        type: channelType,
                        position: channel.position,
                        parent_id: channel.parent_id ? channelMap.get(channel.parent_id) : undefined,
                        topic: channel.topic,
                        nsfw: channel.nsfw,
                        bitrate: channelType === 2 ? (channel.bitrate || 64000) : undefined,
                        user_limit: channelType === 2 ? channel.user_limit : undefined,
                        rate_limit_per_user: channelType === 0 ? channel.rate_limit_per_user : undefined,
                        permission_overwrites: permissionOverwrites
                    }
                });
                await new Promise(resolve => setTimeout(resolve, 600));
            } catch (e) {
            }
        }

        Toasts.show({
            message: `The copy of ${guildName} is complete!`,
            type: Toasts.Type.SUCCESS,
            id: "guild-copy-success"
        });

    } catch (error) {
        Toasts.show({
            message: `Error while copying ${guildName}`,
            type: Toasts.Type.FAILURE,
            id: "guild-copy-error"
        });

    }
}

export default definePlugin({
    name: "GuildDuplicator",
    description: "Create a brand-new Discord server by cloning the structure of any guild.",
    authors: [Devs.Soren],

    contextMenus: {
        "guild-context": (children, { guild }) => {
            if (!guild) return;

            children.push(
                <Menu.MenuSeparator />,
                <Menu.MenuItem
                    id="copy-guild"
                    label="Clone Server"
                    action={() => copyAndPasteGuild(guild.id)}
                />
            );
        }
    }
});

