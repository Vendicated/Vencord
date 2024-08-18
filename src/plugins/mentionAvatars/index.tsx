/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { SelectedGuildStore, useState } from "@webpack/common";
import { User } from "discord-types/general";

const settings = definePluginSettings({
    where: {
        type: OptionType.SELECT,
        description: "Where to display the Avatar",
        options: [
            { label: "Avatar then name", value: "Avatar-name", default: true },
            { label: "Name then avatar", value: "Name-Avatar" },
        ],
    },
    showAtSymbol: {
        type: OptionType.BOOLEAN,
        description: "Whether the @ symbol should be displayed",
        default: true
    }
});

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

    settings,

    renderUsername: ErrorBoundary.wrap((props: { user: User, username: string; }) => {
        const { user, username } = props;
        const [isHovering, setIsHovering] = useState(false);

        const avatar = (
        <img src={user.getAvatarURL(SelectedGuildStore.getGuildId(), 16, isHovering)} className="vc-mentionAvatars-avatar" />
    );

        if (!user) return <>{getUsernameString(username)}</>;

        return (
            <span
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
            >
                {settings.store.where === "Avatar-name" ? <>{avatar}{getUsernameString(username)}</> : <>{getUsernameString(username)} {avatar}</>}
            </span>
        );
    }, { noop: true })

});

function getUsernameString(username: string) {
    return settings.store.showAtSymbol
        ? `@${username}`
        : username;
}
