/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Constants, PermissionsBits, PermissionStore, React, RestAPI, useCallback, useEffect, useState } from "@webpack/common";

const showIcon = () => {
    const [show, setShow] = useState(false);

    const handleKeys = useCallback(e => {
        const keysHeld = e.ctrlKey && e.altKey;
        setShow(keysHeld);
    }, []);

    useEffect(() => {
        window.addEventListener("keydown", handleKeys);
        window.addEventListener("keyup", handleKeys);

        return () => {
            window.removeEventListener("keydown", handleKeys);
            window.removeEventListener("keyup", handleKeys);
        };
    }, [handleKeys]);

    return show;
};

export default definePlugin({
    name: "FastDeleteChannels",
    description: "Adds a trash icon to delete channels when holding ctrl + alt",
    authors: [EquicordDevs.thororen],
    patches: [
        // TY TypingIndicator
        {
            find: "UNREAD_IMPORTANT:",
            replacement: {
                match: /\.name,{.{0,140}\.children.+?:null(?<=,channel:(\i).+?)/,
                replace: "$&,$self.TrashIcon($1)"
            }
        },
        {
            find: "M11 9H4C2.89543 9 2 8.10457 2 7V1C2 0.447715 1.55228 0 1 0C0.447715 0 0 0.447715 0 1V7C0 9.20914 1.79086 11 4 11H11C11.5523 11 12 10.5523 12 10C12 9.44771 11.5523 9 11 9Z",
            replacement: {
                match: /mentionsCount:\i.+?null(?<=channel:(\i).+?)/,
                replace: "$&,$self.TrashIcon($1)"
            }
        }
    ],
    TrashIcon: channel => {
        const show = showIcon();

        if (!show || !PermissionStore.can(PermissionsBits.MANAGE_CHANNELS, channel)) return null;

        return (
            <span
                onClick={() => RestAPI.del({ url: Constants.Endpoints.CHANNEL(channel.id) })}
            >
                <svg
                    width="16"
                    height="16"
                    fill="none"
                    viewBox="0 0 24 24"
                    color="#ed4245"
                >
                    <path
                        fill="currentColor"
                        d="M14.25 1c.41 0 .75.34.75.75V3h5.25c.41 0 .75.34.75.75v.5c0 .41-.34.75-.75.75H3.75A.75.75 0 0 1 3 4.25v-.5c0-.41.34-.75.75-.75H9V1.75c0-.41.34-.75.75-.75h4.5Z"
                    />
                    <path
                        fill="currentColor"
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M5.06 7a1 1 0 0 0-1 1.06l.76 12.13a3 3 0 0 0 3 2.81h8.36a3 3 0 0 0 3-2.81l.75-12.13a1 1 0 0 0-1-1.06H5.07ZM11 12a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Zm3-1a1 1 0 1 1 1 1v6a1 1 0 1 1-2 0v-6a1 1 0 0 1 1-1Z"
                    />
                </svg>
            </span>
        );
    }
});
