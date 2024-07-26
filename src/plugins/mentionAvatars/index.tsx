/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import type { UserRecord } from "@vencord/discord-types";
import { SelectedGuildStore, useState } from "@webpack/common";

export default definePlugin({
    name: "MentionAvatars",
    description: "Shows user avatars inside mentions",
    authors: [Devs.Ven],

    patches: [{
        find: ".USER_MENTION)",
        replacement: {
            match: /children:"@"\.concat\((null!=\i\?\i:\i)\)(?<=\.useName\((\i)\).+?)/,
            replace: "children:$self.renderUsername({username:$1,user:$2})"
        }
    }],

    renderUsername: ErrorBoundary.wrap((props: { user?: UserRecord; username: string; }) => {
        const { user, username } = props;
        const [isHovering, setIsHovering] = useState(false);

        if (!user) return "@" + username;

        return (
            <span
                onMouseEnter={() => { setIsHovering(true); }}
                onMouseLeave={() => { setIsHovering(false); }}
            >
                <img src={user.getAvatarURL(SelectedGuildStore.getGuildId(), 16, isHovering)} className="vc-mentionAvatars-avatar" />
                @{username}
            </span>
        );
    }, { noop: true })
});
