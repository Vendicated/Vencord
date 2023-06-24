/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Devs } from "@utils/constants";
import { useForceUpdater } from "@utils/react";
import definePlugin from "@utils/types";
import { useEffect } from "@webpack/common";
import { Channel, Message } from "discord-types/general";

const forceUpdaters = new Map<string, () => void>();

function useUpdater(data: { channel: Channel; message: Message; }) {
    const forceUpdater = useForceUpdater();

    useEffect(() => {
        forceUpdaters.set(data.message.id, forceUpdater);
        return () => void forceUpdaters.delete(data.message.id);
    }, [data.message.id]);
}

export default definePlugin({
    name: "ComponentUpdaterAPI",
    description: "API to update / force rerender several components, such as messages",
    authors: [Devs.Ven],

    patches: [{
        find: ".renderContentOnly;",
        replacement: {
            match: /=(\i)\.renderContentOnly;/,
            replace: "$&$self.useUpdater($1);"
        }
    }],

    useUpdater,
    forceUpdaters
});
