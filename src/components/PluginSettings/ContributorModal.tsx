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

    const pluginList = useMemo(() => {
        const allPlugins = Object.values(Plugins).filter(p => !p.name.endsWith("API"));
        if (DevsById[user.id])
            return allPlugins.filter(p => p.authors.includes(DevsById[user.id]));

        return allPlugins.filter(p => p.authors.some(a => a.name === user.username));
    }, [user.id, user.username]);

    return (
        <>
            <div className={cl("header")}>
                <img
                    src={user.getAvatarURL(void 0, 512, true)}
                    alt=""
                />
                <Forms.FormTitle tag="h2" className={cl("name")}>{user.username}</Forms.FormTitle>
            </div>

            <div className={cl("plugins")}>
                {pluginList.map(p =>
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
