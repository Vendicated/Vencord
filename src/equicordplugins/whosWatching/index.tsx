/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { EquicordDevs } from "@utils/constants";
import { getIntlMessage, openUserProfile } from "@utils/discord";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy, findComponentByCodeLazy, findStoreLazy } from "@webpack";
import { Clickable, Forms, RelationshipStore, Tooltip, UserStore, useStateFromStores } from "@webpack/common";
import { User } from "discord-types/general";
import { JSX } from "react";

interface WatchingProps {
    userIds: string[];
    guildId?: string;
}

const cl = classNameFactory("whosWatching-");

function getUsername(user: any): string {
    return RelationshipStore.getNickname(user.id) || user.globalName || user.username;
}

const settings = definePluginSettings({
    showPanel: {
        description: "Show spectators under screenshare panel",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
});

function Watching({ userIds, guildId }: WatchingProps): JSX.Element {
    // Missing Users happen when UserStore.getUser(id) returns null
    // The client should automatically cache spectators, so this might not be possible but it's better to be sure just in case
    let missingUsers = 0;
    const users = userIds.map(id => UserStore.getUser(id)).filter(user => Boolean(user) ? true : (missingUsers += 1, false));
    return (
        <div className={cl("content")}>
            {userIds.length ?
                (<>
                    <Forms.FormTitle>{getIntlMessage("SPECTATORS", { numViewers: userIds.length })}</Forms.FormTitle>
                    <Flex flexDirection="column" style={{ gap: 6 }} >
                        {users.map(user => (
                            <Flex key={user.id} flexDirection="row" style={{ gap: 6, alignContent: "center" }} className={cl("user")} >
                                <img src={user.getAvatarURL(guildId)} style={{ borderRadius: 8, width: 16, height: 16 }} alt="" />
                                {getUsername(user)}
                            </Flex>
                        ))}
                        {missingUsers > 0 && <span className={cl("more_users")}>{`+${getIntlMessage("NUM_USERS", { num: missingUsers })}`}</span>}
                    </Flex>
                </>)
                : (<span className={cl("no_viewers")}>No spectators</span>)}
        </div>
    );
}

const ApplicationStreamingStore = findStoreLazy("ApplicationStreamingStore");

const UserSummaryItem = findComponentByCodeLazy("defaultRenderUser", "showDefaultAvatarsForNullUsers");
const AvatarStyles = findByPropsLazy("moreUsers", "emptyUser", "avatarContainer", "clickableAvatar");

export default definePlugin({
    name: "WhosWatching",
    description: "Hover over the screenshare icon to view what users are watching your stream",
    authors: [EquicordDevs.Fres],
    settings,
    patches: [
        {
            find: ".Masks.STATUS_SCREENSHARE,width:32",
            replacement: {
                match: /jsx\)\((\i\.\i),{mask:/,
                replace: "jsx)($self.component({OriginalComponent:$1}),{mask:"
            }
        },
        {
            predicate: () => settings.store.showPanel,
            find: "this.renderEmbeddedActivity()",
            replacement: {
                match: /(?<=children.{0,50})"div"(?=.{0,500}this\.renderEmbeddedActivity\(\))/,
                replace: "$self.WrapperComponent"
            }
        }
    ],
    WrapperComponent: ErrorBoundary.wrap(props => {
        const stream = useStateFromStores([ApplicationStreamingStore], () => ApplicationStreamingStore.getCurrentUserActiveStream());
        if (!stream) return <div {...props}>{props.children}</div>;

        const userIds: string[] = ApplicationStreamingStore.getViewerIds(stream);
        let missingUsers = 0;
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
                <div className={classes(cl("spectators_panel"), Margins.top8)} style={{ marginLeft: 8 }}>
                    <Forms.FormTitle tag="h3" style={{ marginTop: 8, marginBottom: 0, textTransform: "uppercase" }}>
                        {getIntlMessage("SPECTATORS", { numViewers: userIds.length })}
                    </Forms.FormTitle>
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
                        : <Forms.FormText>No spectators</Forms.FormText>
                    }
                </div>
            </>
        );
    }),
    component: function ({ OriginalComponent }) {
        return ErrorBoundary.wrap((props: any) => {
            const stream = useStateFromStores(
                [ApplicationStreamingStore],
                () => ApplicationStreamingStore.getCurrentUserActiveStream()
            );
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
