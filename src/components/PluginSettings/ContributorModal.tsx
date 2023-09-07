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
import { getTheme, Theme } from "@utils/discord";
import { ModalContent, ModalRoot, openModal } from "@utils/modal";
import { Forms, showToast, useMemo } from "@webpack/common";
import { User } from "discord-types/general";

import Plugins from "~plugins";

import { PluginCard } from ".";

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

const GithubLight = "/assets/3ff98ad75ac94fa883af5ed62d17c459.svg";
const GithubDark = "/assets/6a853b4c87fce386cbfef4a2efbacb09.svg";

function GithubIcon() {
    const src = getTheme() === Theme.Light ? GithubLight : GithubDark;
    return <img src={src} alt="GitHub" />;
}

function ContributorModal({ user }: { user: User; }) {
    useSettings();

    // TODO: unhardcode - Decide whether we want to hardcode in devs object or fetch from discord connections
    const githubName = "Vendicated";

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
                    {githubName && (
                        <Link href={`https://github.com/${githubName}`}>
                            <GithubIcon />
                        </Link>
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
