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
            replacement: [
                {
                    match: /(?<=children:\i\}\):\i,)null!=\i/,
                    replace: "($&||Vencord.Api.NicknameIcons._renderIcons({userId:arguments[0].user?.id})?.length)"
                },
                {
                    match: /(?<=shouldUnderlineOnHover:null.{0,300})children:(\i)(?=\}\)\])/,
                    replace: "children:[...Vencord.Api.NicknameIcons._renderIcons({userId:arguments[0].user?.id}),$1]"
                }
            ]
        }
    ]
});
