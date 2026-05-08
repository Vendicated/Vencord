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

import { Flex } from "@components/Flex";
import { Author, Contributor } from "@plugins/philsPluginLibrary/types";
import { openURL } from "@plugins/philsPluginLibrary/utils";
import { findByProps } from "@webpack";
import { Text } from "@webpack/common";
import React from "react";

import { AuthorUserSummaryItem } from "./AuthorSummaryItem";

export interface ContributorAuthorSummaryProps {
    author?: Author;
    contributors?: Contributor[];
}

const openUserProfile = (userId: string) => {
    try {
        const UserProfileModals = findByProps("open", "openUserProfileModal");
        if (UserProfileModals?.open) {
            UserProfileModals.open(userId);
            return;
        }
    } catch (e) {
        console.error("Failed to open profile:", e);
    }

    try {
        const { openUserProfileModal } = findByProps("openUserProfileModal");
        if (openUserProfileModal) {
            openUserProfileModal({ userId });
            return;
        }
    } catch (e) {
        console.error("Failed to open profile modal:", e);
    }

    try {
        if ((window as any).DiscordNative?.userProfile) {
            (window as any).DiscordNative.userProfile.open(userId);
        }
    } catch (e) {
        console.error("Failed to open profile with DiscordNative:", e);
    }
};

export const ContributorAuthorSummary = ({ author, contributors }: ContributorAuthorSummaryProps) => {
    return (
        <Flex style={{ gap: "0.7em" }}>
            {author &&
                <Flex style={{ justifyContent: "center", alignItems: "center", gap: "0.5em" }}>
                    <Text variant="text-sm/normal" style={{ color: "var(--text-muted)" }}>
                        Author: <a
                            onClick={e => {
                                e.preventDefault();

                                if (e.shiftKey && author.github) {
                                    openURL(author.github);
                                } else {

                                    openUserProfile(author.id.toString());
                                }
                            }}
                            style={{ cursor: "pointer" }}
                            title={author.github ? "Click to view Discord profile (Shift+Click for GitHub)" : "Click to view Discord profile"}
                        >{`${author.name}`}</a>
                    </Text>
                    <AuthorUserSummaryItem authors={[author]} />
                </Flex>
            }
            {(contributors && contributors.length > 0) &&
                <Flex style={{ justifyContent: "center", alignItems: "center", gap: "0.5em" }}>
                    <Text variant="text-sm/normal" style={{ color: "var(--text-muted)" }}>
                        Contributors:
                    </Text>
                    <AuthorUserSummaryItem authors={contributors} />
                </Flex>
            }
        </Flex>
    );
};
