/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { Flex } from "@components/Flex";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy, findStoreLazy } from "@webpack";
import { Forms, i18n, RelationshipStore, Tooltip, UserStore, useStateFromStores } from "@webpack/common";

interface WatchingProps {
    userIds: string[];
    guildId?: string;
}

const cl = classNameFactory("whosWatching-");

function getUsername(user: any): string {
    return RelationshipStore.getNickname(user.id) || user.globalName || user.username;
}

function Watching({ userIds, guildId }: WatchingProps): JSX.Element {
    // Missing Users happen when UserStore.getUser(id) returns null -- The client should automatically cache spectators, so this might not be possible but it's better to be sure just in case
    let missingUsers = 0;
    const users = userIds.map(id => UserStore.getUser(id)).filter(user => Boolean(user) ? true : (missingUsers += 1, false));
    return (
        <div className={cl("content")}>
            {userIds.length ?
                (<>
                    <Forms.FormTitle>{i18n.Messages.SPECTATORS.format({ numViewers: userIds.length })}</Forms.FormTitle>
                    <Flex flexDirection="column" style={{ gap: 6 }} >
                        {users.map(user => (
                            <Flex flexDirection="row" style={{ gap: 6, alignContent: "center" }} className={cl("user")} >
                                <img src={user.getAvatarURL(guildId)} style={{ borderRadius: 8, width: 16, height: 16 }} />
                                {getUsername(user)}
                            </Flex>
                        ))}
                        {missingUsers > 0 && <span className={cl("more_users")}>{`+${i18n.Messages.NUM_USERS.format({ num: missingUsers })}`}</span>}
                    </Flex>
                </>)
                : (<span className={cl("no_viewers")}>No spectators</span>)}
        </div>
    );
}

const ApplicationStreamingStore = findStoreLazy("ApplicationStreamingStore");
const StreamKeyHelper: {
    encodeStreamKey: (any) => string;
} = findByPropsLazy("encodeStreamKey");

export default definePlugin({
    name: "WhosWatching",
    description: "Lets you view what users are watching your stream by hovering over the screenshare icon",
    authors: [
        Devs.Fres
    ],
    patches: [
        {
            find: ".Masks.STATUS_SCREENSHARE,width:32",
            replacement: {
                match: /default:function\(\)\{return ([a-zA-Z0-9_]{0,5})\}/,
                replace: "default:function(){return $self.component({OriginalComponent:$1})}"
            }
        }
    ],
    component: function ({ OriginalComponent }) {
        return (props: any) => {
            const stream = useStateFromStores([ApplicationStreamingStore], () => ApplicationStreamingStore.getCurrentUserActiveStream());
            const viewers = ApplicationStreamingStore.getViewerIds(StreamKeyHelper.encodeStreamKey(stream));
            return <Tooltip text={<Watching userIds={viewers} guildId={stream.guildId} />}>
                {({ onMouseEnter, onMouseLeave }) => (
                    <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
                        <OriginalComponent {...props} />
                    </div>
                )}
            </Tooltip>;
        };
    }
});
