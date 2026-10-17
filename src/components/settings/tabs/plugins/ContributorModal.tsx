/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./ContributorModal.css";

import { useSettings } from "@api/Settings";
import { Heading } from "@components/Heading";
import { Link } from "@components/Link";
import { Paragraph } from "@components/Paragraph";
import { EquicordDevsById, VencordDevsById } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { fetchUserProfile } from "@utils/discord";
import { pluralize } from "@utils/misc";
import { RenderModalProps, User } from "@vencord/discord-types";
import { Modal, openModal, showToast, useEffect, useMemo, UserProfileStore, useStateFromStores } from "@webpack/common";

import Plugins, { PluginMeta } from "~plugins";

import { PluginCard } from "./PluginCard";
import { GithubButton, WebsiteButton } from "./PluginModalButtons";

const cl = classNameFactory("vc-author-modal-");

export function openContributorModal(user: User) {
    openModal(modalProps => <ContributorModal user={user} modalProps={modalProps} />);
}

function ContributorModal({ user, modalProps }: { user: User; modalProps: RenderModalProps; }) {
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
        <Modal
            {...modalProps}
            title={
                <div className={cl("header")}>
                    <img
                        className={cl("avatar")}
                        src={user.getAvatarURL(void 0, 512, true)}
                        alt=""
                    />
                    <Heading tag="h2" className={cl("name")}>{user.username}</Heading>
                </div>
            }
            subtitle={
                plugins.length
                    ? (
                        <Paragraph>
                            {user.username} has {ContributedHyperLink} to {pluralize(plugins.length, "plugin")}!
                        </Paragraph>
                    )
                    : (
                        <Paragraph>
                            {user.username} has not made any plugins. They likely {ContributedHyperLink} in other ways!
                        </Paragraph>
                    )
            }
            actionBarInput={
                hasLinks && (
                    <div
                        className={cl("links")}
                        style={{ width: "100%", justifyContent: "flex-end" }}
                    >
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
                )
            }
        >
            <div className={cl("root")}>
                {!!plugins.length && (
                    <div className={cl("plugins")}>
                        {plugins.map(p =>
                            <PluginCard
                                key={p.name}
                                plugin={p}
                                disabled={p.required ?? false}
                                onRestartNeeded={() => showToast({ text: "Restart to apply changes!" })}
                            />
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
}
