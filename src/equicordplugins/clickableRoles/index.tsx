/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { openUserProfile } from "@utils/discord";
import { isTruthy } from "@utils/guards";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import type { Role } from "@vencord/discord-types";
import { findByPropsLazy } from "@webpack";
import { Constants, GuildRoleStore, IconUtils, Popout, RestAPI, ScrollerThin, useEffect, useRef, UserStore, useState, useStateFromStores } from "@webpack/common";

const logger = new Logger("ClickableRoles");

const cl = classNameFactory("vc-clickableroles-");

const GuildActions = findByPropsLazy("requestMembersById", "banUser");

const MAX_VISIBLE_MEMBERS = 20;
const CACHE_TTL = 60_000;

const memberCache = new Map<string, { ids: string[]; timestamp: number; }>();

function getCachedMemberIds(guildId: string, roleId: string) {
    const key = `${guildId}-${roleId}`;
    const cached = memberCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.ids;
    return null;
}

function setCachedMemberIds(guildId: string, roleId: string, ids: string[]) {
    memberCache.set(`${guildId}-${roleId}`, { ids, timestamp: Date.now() });
}

function RoleMembersList({ roleId, guildId, closePopout, setPopoutRef }: { roleId: string; guildId: string; closePopout(): void; setPopoutRef(ref: HTMLDivElement | null): void; }) {
    const [memberIds, setMemberIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    const role = useStateFromStores([GuildRoleStore], () => GuildRoleStore.getRole(guildId, roleId));

    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        let cancelled = false;

        const cached = getCachedMemberIds(guildId, roleId);
        if (cached) {
            setTotalCount(cached.length);
            const visible = cached.slice(0, MAX_VISIBLE_MEMBERS);
            setMemberIds(visible);
            if (visible.length) GuildActions.requestMembersById(guildId, visible, false);
            setLoading(false);
        } else {
            RestAPI.get({
                url: Constants.Endpoints.GUILD_ROLE_MEMBER_IDS(guildId, roleId),
            }).then(res => {
                if (cancelled) return;
                const ids = res.body as string[];
                setCachedMemberIds(guildId, roleId, ids);
                setTotalCount(ids.length);
                const visible = ids.slice(0, MAX_VISIBLE_MEMBERS);
                setMemberIds(visible);
                if (visible.length) GuildActions.requestMembersById(guildId, visible, false);
                setLoading(false);
            }).catch(e => {
                if (cancelled) return;
                logger.error("Failed to fetch role members", e);
                setLoading(false);
            });
        }

        return () => { cancelled = true; };
    }, [guildId, roleId]);

    const users = useStateFromStores(
        [UserStore],
        () => memberIds.map(id => UserStore.getUser(id)).filter(isTruthy),
        [memberIds]
    );

    return (
        <div className={cl("popout")} ref={setPopoutRef}>
            <div className={cl("header")}>
                <span className={cl("color")} style={{ backgroundColor: role?.colorString ?? "var(--background-mod-strong)" }} />
                <span className={cl("name")}>{role?.name ?? "Unknown Role"}</span>
                <span className={cl("count")}>{totalCount}</span>
            </div>
            <ScrollerThin className={cl("list")} fade>
                {loading ? (
                    <div className={cl("empty")}>Loading members...</div>
                ) : users.length === 0 ? (
                    <div className={cl("empty")}>No members found.</div>
                ) : users.map(user => (
                    <div
                        key={user.id}
                        className={cl("user")}
                        onClick={() => {
                            closePopout();
                            openUserProfile(user.id);
                        }}
                    >
                        <img src={IconUtils.getUserAvatarURL(user)} alt="" className={cl("avatar")} />
                        <span>{user.globalName ?? user.username}</span>
                    </div>
                ))}
                {totalCount > MAX_VISIBLE_MEMBERS && (
                    <div className={cl("overflow")}>and {totalCount - MAX_VISIBLE_MEMBERS} more</div>
                )}
            </ScrollerThin>
        </div>
    );
}

function ClickableRole({ roleId, guildId, children }: { roleId: string; guildId: string; children: React.ReactNode; }) {
    const ref = useRef<HTMLDivElement>(null);

    return (
        <Popout
            targetElementRef={ref}
            position="right"
            align="center"
            autoInvert
            nudgeAlignIntoViewport
            renderPopout={({ closePopout, setPopoutRef }) => (
                <RoleMembersList roleId={roleId} guildId={guildId} closePopout={closePopout} setPopoutRef={setPopoutRef} />
            )}
        >
            {popoutProps => (
                <div ref={ref} {...popoutProps} className={cl("trigger")}>
                    {children}
                </div>
            )}
        </Popout>
    );
}

const WrappedClickableRole = ErrorBoundary.wrap(ClickableRole, { noop: true });

export default definePlugin({
    name: "ClickableRoles",
    description: "Click on roles in user profiles and the member list to see which members have them.",
    tags: ["Appearance", "Roles"],
    authors: [Devs.prism],

    patches: [
        {
            find: "#{intl::zr0Y5R::raw}",
            replacement: {
                match: /(\.colorString\?\?\i;)return(.*?enableTooltip:!1\}\):null,\i\]\}\))/,
                replace: "$1return $self.wrapRolePill(arguments[0],()=>$2)",
            },
        },
        {
            find: 'tutorialId:"whos-online"',
            replacement: {
                match: /\((function\(\i\)\{let\{id:.*?#{intl::CHANNEL_MEMBERS_A11Y_LABEL}.*?\}\))\}\);/,
                replace: "($self.wrapRoleGroup($1}));",
            },
        },
    ],

    wrapRoleGroup(originalFn: (props: { id: string; guildId: string; }) => React.ReactNode) {
        return (props: { id: string; guildId: string; }) => {
            const result = originalFn(props);
            if (!GuildRoleStore.getRole(props.guildId, props.id)) return result;
            return (
                <WrappedClickableRole roleId={props.id} guildId={props.guildId}>
                    {result}
                </WrappedClickableRole>
            );
        };
    },

    wrapRolePill(props: { role: Role; guildId: string; }, renderOriginal: () => React.ReactNode) {
        return (
            <WrappedClickableRole roleId={props.role.id} guildId={props.guildId}>
                {renderOriginal()}
            </WrappedClickableRole>
        );
    },
});
