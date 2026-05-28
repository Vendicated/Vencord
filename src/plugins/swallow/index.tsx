import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Menu } from "@webpack/common";
import type { Channel, Guild } from "@vencord/discord-types";
import type { User } from "@vencord/discord-types";

import { settings } from "./settings";

function openSwallow(path: string) {
    const base = (settings.store.webUrl || "https://swallow.fr").replace(/\/$/, "");
    VencordNative.native.openExternal(`${base}${path}`);
}

const userContextPatch: NavContextMenuPatchCallback = (children, { user }: { user?: User; }) => {
    if (!user) return;
    children.push(
        <Menu.MenuItem
            id="vc-swallow-user"
            label="Swallow — Open data"
            action={() => openSwallow(`/users/${user.id}`)}
        />
    );
};

const guildContextPatch: NavContextMenuPatchCallback = (children, { guild }: { guild?: Guild; }) => {
    if (!guild) return;
    children.push(
        <Menu.MenuItem
            id="vc-swallow-guild"
            label="Swallow — Open data"
            action={() => openSwallow(`/guilds/${guild.id}`)}
        />
    );
};

const channelContextPatch: NavContextMenuPatchCallback = (children, { channel }: { channel?: Channel; }) => {
    if (!channel) return;
    children.push(
        <Menu.MenuItem
            id="vc-swallow-channel"
            label="Swallow — Open data"
            action={() => openSwallow(`/channels/${channel.id}`)}
        />
    );
};

export default definePlugin({
    name: "Swallow",
    description: "Ouvre les données archivées d'un utilisateur, serveur ou salon sur Swallow",
    authors: [Devs.m1000],
    settings,

    contextMenus: {
        "user-context": userContextPatch,
        "user-profile-actions": userContextPatch,
        "guild-context": guildContextPatch,
        "guild-header-popout": guildContextPatch,
        "channel-context": channelContextPatch,
        "thread-context": channelContextPatch,
        "gdm-context": channelContextPatch,
    },
});
