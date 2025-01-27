/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import { copyWithToast } from "@utils/misc";
import definePlugin from "@utils/types";
import { findByCodeLazy } from "@webpack";
import { User } from "discord-types/general";

interface MakeContextMenuProps {
    user: User,
    activity: any;
}

// This is an API call if the result is not cached
// i looked for an hour and did not find a better way to do this
const getMetadataFromApi: (activity: any, userId: string) => Promise<any> = findByCodeLazy("null/undefined");

export default definePlugin({
    name: "CopyStatusUrls",
    description: "Copy the users status url when you right-click it",
    authors: [Devs.sadan],
    patches: [
        {
            find: "?\"PRESS_WATCH_ON_CRUNCHYROLL_BUTTON\"",
            replacement: {
                match: /(?<=fullWidth:!0,)(?=onClick)(?=.{0,200}index:(\i))/,
                replace: "onContextMenu: $self.makeContextMenu(arguments[0], $1),"
            }
        }
    ],

    makeContextMenu(props: MakeContextMenuProps, index: number) {
        return async () => {
            const { button_urls } = await getMetadataFromApi(props.activity, props.user.id);
            if (!button_urls[index]) {
                console.error("button_urls does not contain index");
                return;
            }
            copyWithToast(button_urls[index]);
        };
    }
});

