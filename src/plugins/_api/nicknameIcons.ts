/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "NicknameIconsAPI",
    description: "API to add icons to the nickname, in profiles",
    authors: [Devs.Nuckyz],
    patches: [
        {
            find: "#{intl::USER_PROFILE_PRONOUNS}",
            replacement: {
                match: /(\.nicknameIcons,children:)(\i)/,
                replace: "$1[...Vencord.Api.NicknameIcons._renderIcons({userId:arguments[0].user?.id}),$2]"
            }
        }
    ]
});
