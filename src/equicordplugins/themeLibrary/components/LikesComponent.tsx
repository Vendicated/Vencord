/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { Button, useEffect, UserStore, useState } from "@webpack/common";
import type { User } from "discord-types/general";

import type { Theme, ThemeLikeProps } from "../types";
import { themeRequest } from "./ThemeTab";

const logger = new Logger("ThemeLibrary", "#e5c890");

const fetchLikes = async () => {
    try {
        const response = await themeRequest("/likes/get");
        const data = await response.json();
        return data;
    } catch (err) {
        logger.error(err);
    }
};

export const LikesComponent = ({ themeId, likedThemes: initialLikedThemes }: { themeId: Theme["id"], likedThemes: ThemeLikeProps | undefined; }) => {
    const [likesCount, setLikesCount] = useState(0);
    const [likedThemes, setLikedThemes] = useState(initialLikedThemes);

    useEffect(() => {
        const likes = getThemeLikes(themeId);
        logger.debug("likes", likes, "for:", themeId);
        setLikesCount(likes);
    }, [likedThemes, themeId]);

    function getThemeLikes(themeId: Theme["id"]): number {
        const themeLike = likedThemes?.likes.find(like => like.themeId === themeId as unknown as Number);
        return themeLike ? themeLike.userIds.length : 0;
    }

    const likeIcon = (isLiked: boolean) => (
        <svg viewBox="0 0 20 20" fill={isLiked ? "red" : "currentColor"} aria-hidden="true" width="18" height="18" className="vce-likes-icon vce-likes-icon-animation">
            <path d="M16.44 3.10156C14.63 3.10156 13.01 3.98156 12 5.33156C10.99 3.98156 9.37 3.10156 7.56 3.10156C4.49 3.10156 2 5.60156 2 8.69156C2 9.88156 2.19 10.9816 2.52 12.0016C4.1 17.0016 8.97 19.9916 11.38 20.8116C11.72 20.9316 12.28 20.9316 12.62 20.8116C15.03 19.9916 19.9 17.0016 21.48 12.0016C21.81 10.9816 22 9.88156 22 8.69156C22 5.60156 19.51 3.10156 16.44 3.10156Z" />
        </svg>
    );

    const handleLikeClick = async (themeId: Theme["id"]) => {
        const theme = likedThemes?.likes.find(like => like.themeId === themeId as unknown as Number);
        const currentUser: User = UserStore.getCurrentUser();
        const hasLiked: boolean = theme?.userIds.includes(currentUser.id) ?? false;
        const endpoint = hasLiked ? "/likes/remove" : "/likes/add";

        try {
            const response = await themeRequest(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                cache: "no-store",
                body: JSON.stringify({
                    userId: currentUser.id,
                    themeId: themeId,
                }),
            });

            if (!response.ok) return logger.error("Couldnt update likes, res:", response.statusText);

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
            // doing it locally isnt the best way probably, but it does the same
            setLikesCount(likesCount + (hasLiked ? -1 : 1));
        } catch (err) {
            logger.error(err);
        }
    };

    const hasLiked = likedThemes?.likes.some(like => like.themeId === themeId as unknown as Number && like.userIds.includes(UserStore.getCurrentUser().id)) ?? false;

    return (
        <div>
            <Button onClick={() => handleLikeClick(themeId)}
                size={Button.Sizes.MEDIUM}
                color={Button.Colors.PRIMARY}
                look={Button.Looks.OUTLINED}
                style={{ marginLeft: "8px" }}
            >
                {likeIcon(hasLiked)} {likesCount}
            </Button>
        </div>
    );
};
