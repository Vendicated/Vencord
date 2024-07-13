/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { IconUtils } from "@webpack/common";
import { User } from "discord-types/general";

export default definePlugin({
    name: "MentionAvatars",
    description: "a",
    authors: [Devs.Ven],

    patches: [{
        find: ".USER_MENTION)",
        replacement: {
            match: /children:"@"\.concat\((?=null!=\i\?\i:\i)(?<=\.useName\((\i)\).+?)/,
            replace: "children:$self.renderUsername($1,"
        }
    }],

    renderUsername(user: User | undefined, username: string) {
        if (!user) return "@" + username;

        return (
            <>
                <img src={IconUtils.getUserAvatarURL(user, true, 24)} className="vc-mentionAvatars-avatar" />
                @{username}
            </>
        );
    }
});
