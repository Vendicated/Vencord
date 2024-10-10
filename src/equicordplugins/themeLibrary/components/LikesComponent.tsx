/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { Button, useEffect, useRef, UserStore, useState } from "@webpack/common";
import type { User } from "discord-types/general";

import type { Theme, ThemeLikeProps } from "../types";
import { isAuthorized } from "../utils/auth";
import { LikeIcon } from "../utils/Icons";
import { logger, themeRequest } from "./ThemeTab";

export const LikesComponent = ({ themeId, likedThemes: initialLikedThemes }: { themeId: Theme["id"], likedThemes: ThemeLikeProps | undefined; }) => {
    const [likesCount, setLikesCount] = useState(0);
    const [likedThemes, setLikedThemes] = useState(initialLikedThemes);
    const debounce = useRef(false);

    useEffect(() => {
        const likes = getThemeLikes(themeId);
        setLikesCount(likes);
    }, [likedThemes, themeId]);

    function getThemeLikes(themeId: Theme["id"]): number {
        const themeLike = likedThemes?.likes.find(like => like.themeId === themeId as unknown as Number);
        return themeLike ? themeLike.userIds.length : 0;
    }

    const handleLikeClick = async (themeId: Theme["id"]) => {
        if (!isAuthorized()) return;
        const theme = likedThemes?.likes.find(like => like.themeId === themeId as unknown as Number);
        const currentUser: User = UserStore.getCurrentUser();
        const hasLiked: boolean = (theme?.userIds.includes(currentUser.id) || themeId === "preview") ?? false;
        const endpoint = hasLiked ? "/likes/remove" : "/likes/add";
        const token = await DataStore.get("ThemeLibrary_uniqueToken");

        // doing this so the delay is not visible to the user
        if (debounce.current) return;
        setLikesCount(likesCount + (hasLiked ? -1 : 1));
        debounce.current = true;

        try {
            const response = await themeRequest(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    token,
                    themeId: themeId,
                }),
            });

            if (!response.ok) return logger.error("Couldnt update likes, response not ok");

            const fetchLikes = async () => {
                try {
                    const response = await themeRequest("/likes/get");
                    const data = await response.json();
                    setLikedThemes(data);
                } catch (err) {
                    logger.error(err);
                }
            };

            fetchLikes();
        } catch (err) {
            logger.error(err);
        }
        debounce.current = false;
    };

    const hasLiked = likedThemes?.likes.some(like => like.themeId === themeId as unknown as Number && like.userIds.includes(UserStore.getCurrentUser().id)) ?? false;

    return (
        <div>
            <Button onClick={() => handleLikeClick(themeId)}
                size={Button.Sizes.MEDIUM}
                color={Button.Colors.PRIMARY}
                look={Button.Looks.OUTLINED}
                disabled={themeId === "preview"}
                style={{ marginLeft: "8px" }}
            >
                {LikeIcon(hasLiked || themeId === "preview")} {themeId === "preview" ? 143 : likesCount}
            </Button>
        </div>
    );
};
