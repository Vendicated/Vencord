/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./ContributorModal.css";

import { useSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { HeadingPrimary } from "@components/Heading";
import { Link } from "@components/Link";
import { Paragraph } from "@components/Paragraph";
import { EquicordDevsById, VencordDevsById } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { fetchUserProfile } from "@utils/discord";
import { pluralise } from "@utils/misc";
import { ModalContent, ModalFooter, ModalRoot, openModal } from "@utils/modal";
import { User } from "@vencord/discord-types";
import { showToast, useEffect, useMemo, UserProfileStore, useStateFromStores } from "@webpack/common";

import Plugins, { PluginMeta } from "~plugins";

import { GithubButton, WebsiteButton } from "./LinkIconButton";
import { PluginCard } from "./PluginCard";

const cl = classNameFactory("vc-author-modal-");

export function openContributorModal(user: User) {
    openModal(modalProps =>
        <ModalRoot {...modalProps}>
            <ErrorBoundary>
                <ContributorModal user={user} />
            </ErrorBoundary>
        </ModalRoot>
    );
}

function ContributorModal({ user }: { user: User; }) {
    useSettings();

    const profile = useStateFromStores([UserProfileStore], () => UserProfileStore.getUserProfile(user.id));

    useEffect(() => {
        if (!profile && !user.bot && user.id)
            fetchUserProfile(user.id);
    }, [user.id, user.bot, profile]);

    const githubName = profile?.connectedAccounts?.find(a => a.type === "github")?.name;
    const website = profile?.connectedAccounts?.find(a => a.type === "domain")?.name;

    const plugins = useMemo(() => {
        const allPlugins = Object.values(Plugins);
        const pluginsByAuthor = (VencordDevsById[user.id] || EquicordDevsById[user.id])
            ? allPlugins.filter(p => p.authors.includes(VencordDevsById[user.id] || EquicordDevsById[user.id]))
            : allPlugins.filter(p =>
                PluginMeta[p.name]?.userPlugin && p.authors.some(a => a.id.toString() === user.id)
                || p.authors.some(a => a.name === user.username)
            );

        return pluginsByAuthor
            .filter(p => !p.name.endsWith("API"))
            .sort((a, b) => Number(a.required ?? false) - Number(b.required ?? false));
    }, [user.id, user.username]);

    const ContributedHyperLink = <Link href="https://github.com/Equicord/Equicord">contributed</Link>;

    const hasLinks = website || githubName;

    return (
        <>
            <ModalContent className={cl("root")}>
                <div className={cl("header")}>
                    <img
                        className={cl("avatar")}
                        src={user.getAvatarURL(void 0, 512, true)}
                        alt=""
                    />
                    <HeadingPrimary className={cl("name")}>{user.username}</HeadingPrimary>
                </div>

                {plugins.length ? (
                    <Paragraph>
                        {user.username} has {ContributedHyperLink} to {pluralise(plugins.length, "plugin")}!
                    </Paragraph>
                ) : (
                    <Paragraph>
                        {user.username} has not made any plugins. They likely {ContributedHyperLink} in other ways!
                    </Paragraph>
                )}

                {!!plugins.length && (
                    <div className={cl("plugins")}>
                        {plugins.map(p =>
                            <PluginCard
                                key={p.name}
                                plugin={p}
                                disabled={p.required ?? false}
                                onRestartNeeded={() => showToast("Restart to apply changes!")}
                            />
                        )}
                    </div>
                )}
            </ModalContent>

            {hasLinks && (
                <ModalFooter>
                    <div className={cl("links")}>
                        {website && (
                            <WebsiteButton
                                text={website}
                                href={`https://${website}`}
                            />
                        )}
                        {githubName && (
                            <GithubButton
                                text={githubName}
                                href={`https://github.com/${githubName}`}
                            />
                        )}
                    </div>
                </ModalFooter>
            )}
        </>
    );
}
