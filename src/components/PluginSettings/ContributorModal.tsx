/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./contributorModal.css";

import { useSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { DevsById } from "@utils/constants";
import { fetchUserProfile, getTheme, Theme } from "@utils/discord";
import { ModalContent, ModalRoot, openModal } from "@utils/modal";
import { Forms, MaskedLink, showToast, useEffect, useMemo, UserProfileStore, useStateFromStores } from "@webpack/common";
import { User } from "discord-types/general";

import Plugins from "~plugins";

import { PluginCard } from ".";

const WebsiteIconDark = "/assets/e1e96d89e192de1997f73730db26e94f.svg";
const WebsiteIconLight = "/assets/730f58bcfd5a57a5e22460c445a0c6cf.svg";
const GithubIconLight = "/assets/3ff98ad75ac94fa883af5ed62d17c459.svg";
const GithubIconDark = "/assets/6a853b4c87fce386cbfef4a2efbacb09.svg";

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

function GithubIcon() {
    const src = getTheme() === Theme.Light ? GithubIconLight : GithubIconDark;
    return <img src={src} alt="GitHub" />;
}

function WebsiteIcon() {
    const src = getTheme() === Theme.Light ? WebsiteIconLight : WebsiteIconDark;
    return <img src={src} alt="Website" />;
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

                <div className={cl("links")}>
                    {website && (
                        <MaskedLink
                            href={"https://" + website}
                        >
                            <WebsiteIcon />
                        </MaskedLink>
                    )}
                    {githubName && (
                        <MaskedLink href={`https://github.com/${githubName}`}>
                            <GithubIcon />
                        </MaskedLink>
                    )}
                </div>
            </div>

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
        </>
    );
}
