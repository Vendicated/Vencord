/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ModalProps } from "@utils/modal";
import { GuildRoleStore, React } from "@webpack/common";

import { toggleRole } from "../storeHelper";
import { RoleModalList } from "./RolesView";
import { Guild } from "@vencord/discord-types";

export function RoleModal({ modalProps, guild, colorsStore }: { modalProps: ModalProps, guild: Guild, colorsStore: Record<string, string[]> }) {
    const [ids, setIds] = React.useState(colorsStore[guild.id]);
    const roles = React.useMemo(() => ids.map(id => GuildStore.getRole(guild.id, id)), [ids]);

    return <RoleModalList
        modalProps={modalProps}
        roleList={roles}
        header={`${guild.name} highlighted roles.`}
        onRoleRemove={id => {
            toggleRole(colorsStore, guild.id, id);
            setIds(colorsStore[guild.id]);
        }}
    />;
}

