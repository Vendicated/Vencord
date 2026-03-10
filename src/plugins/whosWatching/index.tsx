/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { Heading, HeadingSecondary } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { Devs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { getIntlMessage, openUserProfile } from "@utils/discord";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { User } from "@vencord/discord-types";
import { findComponentByCodeLazy, findCssClassesLazy, findStoreLazy } from "@webpack";
import { Clickable, RelationshipStore, Tooltip, UserStore, useStateFromStores } from "@webpack/common";
import { JSX } from "react";

interface WatchingProps {
    userIds: string[];
    guildId?: string;
}

const ApplicationStreamingStore = findStoreLazy("ApplicationStreamingStore");
const UserSummaryItem = findComponentByCodeLazy("defaultRenderUser", "showDefaultAvatarsForNullUsers");
const AvatarStyles = findCssClassesLazy("moreUsers", "emptyUser", "avatarContainer", "clickableAvatar", "avatar");
const cl = classNameFactory("vc-whosWatching-");

function getUsername(user: User): string {
    return RelationshipStore.getNickname(user.id) || user.globalName || user.username;
}

function Watching({ userIds, guildId }: WatchingProps): JSX.Element {
    let missingUsers = 0;
    const users = userIds.map(id => UserStore.getUser(id)).filter(user => Boolean(user) ? true : (missingUsers += 1, false));
    return (
        <div className={cl("content")}>
            {userIds.length ?
                (
                    <>
                        <Heading>{getIntlMessage("SPECTATORS", { numViewers: userIds.length })}</Heading>
                        <Flex flexDirection="column" style={{ gap: 6 }} >
                            {users.map(user => (
                                <Flex key={user.id} flexDirection="row" style={{ gap: 6, alignContent: "center" }} className={cl("user")} >
                                    <img src={user.getAvatarURL(guildId)} style={{ borderRadius: 8, width: 16, height: 16 }} alt="" />
                                    {getUsername(user)}
                                </Flex>
                            ))}
                            {missingUsers > 0 && <span className={cl("more-users")}>{`+${getIntlMessage("NUM_USERS", { num: missingUsers })}`}</span>}
                        </Flex>
                    </>
                )
                : (
                    <span className={cl("no-viewers")}>
                        No spectators
                    </span>
                )
            }
        </div>
    );
}

const settings = definePluginSettings({
    showPanel: {
        description: "Show spectators under screenshare panel",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
});

export default definePlugin({
    name: "WhosWatching",
    description: "Hover over the screenshare icon to view what users are watching your stream",
    authors: [Devs.Fres, Devs.thororen],
    settings,
    patches: [
        {
            find: ".Masks.STATUS_SCREENSHARE,width:32",
            replacement: {
                match: /\((\i\.\i)(?=,{mask:\i\.\i\.Masks\.STATUS_SCREENSHARE)/,
                replace: "($self.component({OriginalComponent:$1})"
            }
        },
        {
            find: "this.renderEmbeddedActivity()",
            replacement: {
                match: /"div"(?=.{0,40}?,this.renderActions\(\))/,
                replace: "$self.WrapperComponent"
            }
        }
    ],
    WrapperComponent: ErrorBoundary.wrap(props => {
        const stream = useStateFromStores([ApplicationStreamingStore], () => ApplicationStreamingStore.getCurrentUserActiveStream());
        if (!stream) return <div {...props}>{props.children}</div>;

        let missingUsers = 0;
        const userIds: string[] = ApplicationStreamingStore.getViewerIds(stream);
        const users = userIds.map(id => UserStore.getUser(id)).filter(user => Boolean(user) ? true : (missingUsers += 1, false));

        function renderMoreUsers(_label: string, count: number) {
            const sliced = users.slice(count - 1);
            return (
                <Tooltip text={<Watching userIds={userIds} guildId={stream.guildId} />}>
                    {({ onMouseEnter, onMouseLeave }) => (
                        <div
                            className={AvatarStyles.moreUsers}
                            onMouseEnter={onMouseEnter}
                            onMouseLeave={onMouseLeave}
                        >
                            +{sliced.length + missingUsers}
                        </div>
                    )}
                </Tooltip>
            );
        }

        return (
            <>
                <div {...props}>{props.children}</div>
                <div className={classes(cl("spectators-panel"), Margins.top8)}>
                    <HeadingSecondary style={{ marginTop: 8, marginBottom: 0, textTransform: "uppercase" }}>
                        {getIntlMessage("SPECTATORS", { numViewers: userIds.length })}
                    </HeadingSecondary>
                    {users.length ?
                        <>
                            <UserSummaryItem
                                users={users}
                                count={userIds.length}
                                renderIcon={false}
                                max={12}
                                showDefaultAvatarsForNullUsers
                                renderMoreUsers={renderMoreUsers}
                                renderUser={(user: User, index: number) => (
                                    <Clickable
                                        key={index}
                                        className={AvatarStyles.clickableAvatar}
                                        onClick={() => openUserProfile(user.id)}
                                    >
                                        <img
                                            className={AvatarStyles.avatar}
                                            src={user.getAvatarURL(void 0, 80, true)}
                                            alt={user.username}
                                            title={user.username}
                                        />
                                    </Clickable>
                                )}
                            />
                        </>
                        : <Paragraph>
                            No spectators
                        </Paragraph>
                    }
                </div>
            </>
        );
    }),
    component: function ({ OriginalComponent }) {
        return ErrorBoundary.wrap(props => {
            const stream = useStateFromStores([ApplicationStreamingStore], () => ApplicationStreamingStore.getCurrentUserActiveStream());
            if (!stream) return null;

            const viewers = ApplicationStreamingStore.getViewerIds(stream);
            return <Tooltip text={<Watching userIds={viewers} guildId={stream.guildId} />}>
                {({ onMouseEnter, onMouseLeave }) => (
                    <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
                        <OriginalComponent {...props} />
                    </div>
                )}
            </Tooltip>;
        });
    }
});
