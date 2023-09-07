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
                            <img
                                src="/assets/6a853b4c87fce386cbfef4a2efbacb09.svg"
                                alt="GitHub"
                            />
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
