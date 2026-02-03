/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { Devs } from "@utils/constants";
import { getIntlMessage, openUserProfile } from "@utils/discord";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy, findStoreLazy } from "@webpack";
import { Forms, RelationshipStore, Text, Tooltip, UserStore, useStateFromStores } from "@webpack/common";
import { JSX } from "react";

interface WatchingProps {
    userIds: string[];
    guildId?: string;
}

const cl = classNameFactory("whosWatching-");


function getUsername(user: any): string {
    if (!user) return "Unknown User";
    try {
        return RelationshipStore?.getNickname?.(user.id) || user.globalName || user.username || "Unknown User";
    } catch {
        return user.username || "Unknown User";
    }
}


function getAvatarURL(user: any, guildId?: string, size: number = 80): string {
    if (!user) return "";
    try {
        if (typeof user.getAvatarURL === 'function') {
            return user.getAvatarURL(guildId, size, true) || "";
        }
        return "";
    } catch {
        return "";
    }
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
    if (!userIds || !Array.isArray(userIds)) {
        return <div className={cl("content")}>
            <span className={cl("no_viewers")}>No spectators</span>
        </div>;
    }

    const users = userIds
        .map(id => {
            try {
                return UserStore.getUser(id);
            } catch {
                return null;
            }
        })
        .filter(user => user !== null && user !== undefined);

    const missingUsers = userIds.length - users.length;

    return (
        <div className={cl("content")}>
            {users.length > 0 ? (
                <>
                    <Forms.FormTitle>
                        {getIntlMessage("SPECTATORS", { numViewers: userIds.length })}
                    </Forms.FormTitle>
                    <Flex flexDirection="column" style={{ gap: 6 }}>
                        {users.map((user) => {
                            if (!user?.id) return null;
                            const avatarUrl = getAvatarURL(user, guildId, 16);
                            return (
                                <Flex
                                    key={user.id}
                                    flexDirection="row"
                                    style={{ gap: 6, alignItems: "center" }}
                                    className={cl("user")}
                                >
                                    {avatarUrl && (
                                        <img
                                            src={avatarUrl}
                                            style={{ borderRadius: 8, width: 16, height: 16 }}
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                            }}
                                        />
                                    )}
                                    <Text variant="text-sm/normal">{getUsername(user)}</Text>
                                </Flex>
                            );
                        })}
                        {missingUsers > 0 && (
                            <span className={cl("more_users")}>
                                +{getIntlMessage("NUM_USERS", { num: missingUsers })}
                            </span>
                        )}
                    </Flex>
                </>
            ) : (
                <span className={cl("no_viewers")}>No spectators</span>
            )}
        </div>
    );
}

const ApplicationStreamingStore = findStoreLazy("ApplicationStreamingStore");

export default definePlugin({
    name: "تشوف من داخل الشير",
    description: "Hover over the screenshare icon to view what users are watching your stream",
    authors: [{
        name: "rz30",
        id: 786315593963536415n
    }, {
        name: "l2cu",
        id: 1208352443512004648n
}],
    settings: settings,
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
                match: /"div"(?=.{0,50}this.renderActions)/,
                replace: "$self.WrapperComponent"
            }
        }
    ],


    WrapperComponent: ErrorBoundary.wrap((props: any) => {
        let stream;
        try {
            stream = useStateFromStores(
                [ApplicationStreamingStore],
                () => ApplicationStreamingStore.getCurrentUserActiveStream?.() || null
            );
        } catch (error) {
            console.error("[WhosWatching] Error getting stream:", error);
            return <div {...props}>{props.children}</div>;
        }

        if (!stream) {
            return <div {...props}>{props.children}</div>;
        }

        let userIds: string[] = [];
        try {
            userIds = ApplicationStreamingStore.getViewerIds?.(stream) || [];
        } catch (error) {
            console.error("[WhosWatching] Error getting viewer IDs:", error);
            return <div {...props}>{props.children}</div>;
        }

        const users = userIds
            .map(id => {
                try {
                    return UserStore.getUser(id);
                } catch {
                    return null;
                }
            })
            .filter(user => user !== null && user !== undefined);

        const missingUsers = userIds.length - users.length;

        return (
            <>
                <div {...props}>{props.children}</div>
                <div className={classes(cl("spectators_panel"), Margins.top8)}>
                    {users.length > 0 ? (
                        <>
                            <Forms.FormTitle tag="h3" style={{ marginTop: 8, marginBottom: 8, textTransform: "uppercase" }}>
                                {getIntlMessage("SPECTATORS", { numViewers: userIds.length })}
                            </Forms.FormTitle>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                {users.slice(0, 12).map((user) => {
                                    if (!user?.id) return null;
                                    const avatarUrl = getAvatarURL(user, stream.guildId, 80);
                                    const username = getUsername(user);

                                    return (
                                        <Tooltip key={user.id} text={username}>
                                            {({ onMouseEnter, onMouseLeave }) => (
                                                <img
                                                    src={avatarUrl || ""}
                                                    alt={username}
                                                    className="vc-whoswatching-avatar"
                                                    style={{
                                                        width: 24,
                                                        height: 24,
                                                        borderRadius: "50%",
                                                        cursor: "pointer",
                                                        objectFit: "cover"
                                                    }}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        try {

                                                            openUserProfile(user.id);
                                                        } catch (error) {
                                                            console.error("[WhosWatching] Error opening profile:", error);
                                                        }
                                                    }}
                                                    onMouseEnter={onMouseEnter}
                                                    onMouseLeave={onMouseLeave}
                                                    onError={(e) => {
                                                        e.currentTarget.src = "";
                                                        e.currentTarget.style.display = 'none';
                                                    }}
                                                />
                                            )}
                                        </Tooltip>
                                    );
                                })}
                                {(users.length > 12 || missingUsers > 0) && (
                                    <Tooltip text={<Watching userIds={userIds} guildId={stream.guildId} />}>
                                        {({ onMouseEnter, onMouseLeave }) => (
                                            <div
                                                onMouseEnter={onMouseEnter}
                                                onMouseLeave={onMouseLeave}
                                                style={{
                                                    width: 24,
                                                    height: 24,
                                                    borderRadius: "50%",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    backgroundColor: "var(--background-tertiary)",
                                                    fontSize: 10,
                                                    fontWeight: 600,
                                                    cursor: "pointer"
                                                }}
                                            >
                                                +{(users.length > 12 ? users.length - 12 : 0) + missingUsers}
                                            </div>
                                        )}
                                    </Tooltip>
                                )}
                            </div>
                        </>
                    ) : (
                        <Forms.FormText style={{ marginTop: 8 }}>No spectators</Forms.FormText>
                    )}
                </div>
            </>
        );
    }),


    component: function ({ OriginalComponent }) {
        return ErrorBoundary.wrap((props: any) => {
            let stream;
            try {
                stream = useStateFromStores(
                    [ApplicationStreamingStore],
                    () => ApplicationStreamingStore.getCurrentUserActiveStream?.() || null
                );
            } catch (error) {
                console.error("[WhosWatching] Error getting stream:", error);
                return <OriginalComponent {...props} />;
            }

            if (!stream) {
                return <OriginalComponent {...props} />;
            }

            let viewers: string[] = [];
            try {
                viewers = ApplicationStreamingStore.getViewerIds?.(stream) || [];
            } catch (error) {
                console.error("[WhosWatching] Error getting viewers:", error);
                return <OriginalComponent {...props} />;
            }

            return (
                <Tooltip text={<Watching userIds={viewers} guildId={stream.guildId} />}>
                    {({ onMouseEnter, onMouseLeave }) => (
                        <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
                            <OriginalComponent {...props} />
                        </div>
                    )}
                </Tooltip>
            );
        });
    }
});
