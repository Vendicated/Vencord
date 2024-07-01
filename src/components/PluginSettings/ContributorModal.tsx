/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./contributorModal.css";

import { useSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { Link } from "@components/Link";
import { DevsById } from "@utils/constants";
import { fetchUserProfile } from "@utils/discord";
import { classes } from "@utils/misc";
import { ModalContent, ModalRoot, openModal } from "@utils/modal";
import { t, Translate } from "@utils/translation";
import { Forms, showToast, useEffect, useMemo, UserProfileStore, useStateFromStores } from "@webpack/common";
import { User } from "discord-types/general";

import Plugins from "~plugins";

import { PluginCard } from ".";
import { GithubButton, WebsiteButton } from "./LinkIconButton";

const cl = classNameFactory("vc-author-modal-");

export function openContributorModal(user: User) {
    openModal(modalProps =>
        <ModalRoot {...modalProps}>
            <ErrorBoundary>
                <ModalContent className={cl("root")}>
                    <ContributorModal user={user} />
                </ModalContent>
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
    }, [user.id]);

    const githubName = profile?.connectedAccounts?.find(a => a.type === "github")?.name;
    const website = profile?.connectedAccounts?.find(a => a.type === "domain")?.name;

    const plugins = useMemo(() => {
        const allPlugins = Object.values(Plugins);
        const pluginsByAuthor = DevsById[user.id]
            ? allPlugins.filter(p => p.authors.includes(DevsById[user.id]))
            : allPlugins.filter(p => p.authors.some(a => a.name === user.username));

        return pluginsByAuthor
            .filter(p => !p.name.endsWith("API"))
            .sort((a, b) => Number(a.required ?? false) - Number(b.required ?? false));
    }, [user.id, user.username]);

    return (
        <>
            <div className={cl("header")}>
                <img
                    className={cl("avatar")}
                    src={user.getAvatarURL(void 0, 512, true)}
                    alt=""
                />
                <Forms.FormTitle tag="h2" className={cl("name")}>{user.username}</Forms.FormTitle>

                <div className={classes("vc-settings-modal-links", cl("links"))}>
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
            </div>

            <Forms.FormText>
                <Translate i18nKey="vencord.pluginContributed" variables={{ count: plugins.length }}>
                    <Link href="https://vencord.dev/source" />
                </Translate>
            </Forms.FormText>

            {!!plugins.length && (
                <div className={cl("plugins")}>
                    {plugins.map(p =>
                        <PluginCard
                            key={p.name}
                            plugin={p}
                            disabled={p.required ?? false}
                            onRestartNeeded={() => showToast(t("vencord.pluginRestart"))}
                        />
                    )}
                </div>
            )}
        </>
    );
}
