/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { sleep } from "@utils/misc";
import { Queue } from "@utils/Queue";
import definePlugin from "@utils/types";
import { findByCodeLazy } from "@webpack";
import { UserStore, useState } from "@webpack/common";
import type { User } from "discord-types/general";
import type { ComponentType, ReactNode } from "react";

const fetching = new Set<string>();
const queue = new Queue(5);
const fetchUser = findByCodeLazy("USER(") as (id: string) => Promise<User>;

interface MentionProps {
    data: {
        userId?: string;
        channelId?: string;
        content: any;
    };
    parse: (content: any, props: MentionProps["props"]) => ReactNode;
    props: {
        key: string;
        formatInline: boolean;
        noStyleAndInteraction: boolean;
    };
    RoleMention: ComponentType<any>;
    UserMention: ComponentType<any>;
}

function MentionWrapper({ data, UserMention, RoleMention, parse, props }: MentionProps) {
    const [userId, setUserId] = useState(data.userId);

    // if userId is set it means the user is cached. Uncached users have userId set to undefined
    if (userId)
        return (
            <UserMention
                className="mention"
                userId={userId}
                channelId={data.channelId}
                inlinePreview={props.noStyleAndInteraction}
                key={props.key}
            />
        );

    // Parses the raw text node array data.content into a ReactNode[]: ["<@userid>"]
    const children = parse(data.content, props);

    return (
        // Discord is deranged and renders unknown user mentions as role mentions
        <RoleMention
            {...data}
            inlinePreview={props.formatInline}
        >
            <span
                onMouseEnter={() => {
                    const mention = children?.[0]?.props?.children;
                    if (typeof mention !== "string") return;

                    const id = mention.match(/<@!?(\d+)>/)?.[1];
                    if (!id) return;

                    if (fetching.has(id))
                        return;

                    if (UserStore.getUser(id))
                        return setUserId(id);

                    const fetch = () => {
                        fetching.add(id);

                        queue.unshift(() =>
                            fetchUser(id)
                                .then(() => {
                                    setUserId(id);
                                    fetching.delete(id);
                                })
                                .catch(e => {
                                    if (e?.status === 429) {
                                        queue.unshift(() => sleep(1000).then(fetch));
                                        fetching.delete(id);
                                    }
                                })
                                .finally(() => sleep(300))
                        );
                    };

                    fetch();
                }}
            >
                {children}
            </span>
        </RoleMention>
    );
}

export default definePlugin({
    name: "ValidUser",
    description: "Fix mentions for unknown users showing up as '<@343383572805058560>' (hover over a mention to fix it)",
    authors: [Devs.Ven],
    tags: ["MentionCacheFix"],

    patches: [{
        find: 'className:"mention"',
        replacement: {
            // mention = { react: function (data, parse, props) { if (data.userId == null) return RoleMention() else return UserMention()
            match: /react:(?=function\(\i,\i,\i\).{0,50}return null==\i\?\(0,\i\.jsx\)\((\i),.+?jsx\)\((\i),\{className:"mention")/,
            // react: (...args) => OurWrapper(RoleMention, UserMention, ...args), originalReact: theirFunc
            replace: "react:(...args)=>$self.renderMention($1,$2,...args),originalReact:"
        }
    }],

    renderMention(RoleMention, UserMention, data, parse, props) {
        return (
            <ErrorBoundary noop>
                <MentionWrapper
                    RoleMention={RoleMention}
                    UserMention={UserMention}
                    data={data}
                    parse={parse}
                    props={props}
                />
            </ErrorBoundary>
        );
    },
});
