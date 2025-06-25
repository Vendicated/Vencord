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
import { classes, pluralise } from "@utils/misc";
import { ModalContent, ModalRoot, openModal } from "@utils/modal";
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

interface ConnectedAccount {
    type: "twitch" | "youtube" | "skype" | "steam" | "leagueoflegends" | "battlenet" | "bluesky" | "bungie" | "reddit" | "twitter" | "twitter_legacy" | "spotify" | "facebook" | "xbox" | "samsung" | "contacts" | "instagram" | "mastodon" | "soundcloud" | "github" | "playstation" | "playstation-stg" | "epicgames" | "riotgames" | "roblox" | "paypal" | "ebay" | "tiktok" | "crunchyroll" | "domain" | "amazon-music";
    /**
     * underlying id of connected account
     * eg. account uuid
     */
    id: string;
    /**
     * display name of connected account
     */
    name: string;
    verified: boolean;
    metadata?: Record<string, unknown>;
}

interface UserProfile extends User {
    /**
     * never actually seen this be undefined, but just in case
     *
     * empty array if no connected accounts
     */
    connectedAccounts?: ConnectedAccount[];
}

function ContributorModal({ user }: { user: User; }) {
    useSettings();

    const profile: UserProfile | undefined = useStateFromStores([UserProfileStore], () => UserProfileStore.getUserProfile(user.id));

    useEffect(() => {
        if (!profile && !user.bot && user.id)
            fetchUserProfile(user.id);
    }, [user.id, user.bot, profile]);

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

    const ContributedHyperLink = <Link href="https://vencord.dev/source">contributed</Link>;

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

            {plugins.length ? (
                <Forms.FormText>
                    This person has {ContributedHyperLink} to {pluralise(plugins.length, "plugin")}!
                </Forms.FormText>
            ) : (
                <Forms.FormText>
                    This person has not made any plugins. They likely {ContributedHyperLink} to Vencord in other ways!
                </Forms.FormText>
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
        </>
    );
}
