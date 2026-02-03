/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Channel } from "@vencord/discord-types";
import { findComponentByCodeLazy } from "@webpack";
import {
    Alerts,
    Button,
} from "@webpack/common";

// likely not 100% accurate but good enough
type ChatbarWithButtonProps = {
    message: string;
    subtitle?: string;
    countdown?: number;
    buttonText: string;
    buttonColor?: string;
    buttonSubmitting?: boolean;
    onButtonClick: () => void;
    imageSrc?: string;
    animationSrc?: string;
    secondaryButtonText?: string;
    onSecondaryButtonClick?: () => void;
    children?: React.ReactNode;
    useReducedMotion?: boolean;
};

const ChatbarWithButton = findComponentByCodeLazy(
    ".getState().isMembersOpen);"
) as React.ComponentType<ChatbarWithButtonProps>;

const settings = definePluginSettings({
    users: {
        type: OptionType.STRING,
        description: "A list of ghosted user IDs, seperated by a comma",
        placeholder: "1, 2, 3, 4",
    },
});

function parseUsers(): string[] {
    return settings.store.users?.split(/, ?/) ?? [];
}

export default definePlugin({
    name: "SelfControl",
    authors: [{
        name: "rz30",
        id: 786315593963536415n
    }, {
        name: "l2cu",
        id: 1208352443512004648n
}],
    description: "Allows you to disable outgoing messages to a specific user",
    settings,
    patches: [
        {
            find: '.CHANGE_LOG_CTA_CLICKED,{cta_type:"chat_blocker",',
            replacement: {
                match: /return\(0,/,
                replace:
                    "if($self.isBlocked(arguments[0].channel)) return $self.blockedMessageBar(arguments[0].channel); $&",
            },
        },
    ],
    isBlocked(channel: Channel) {
        if (!channel?.recipients) {
            return false;
        }

        const userId = channel.recipients[0];

        return parseUsers().includes(userId);
    },
    blockedMessageBar(channel: Channel) {
        return (
            <ChatbarWithButton
                buttonText="Un-Ghost"
                // wow
                imageSrc="data:image/octet-stream;base64,UklGRlAEAABXRUJQVlA4WAoAAAAwAAAAOwAALwAASUNDUKACAAAAAAKgbGNtcwQwAABtbnRyUkdCIFhZWiAH5QAJABsAAAAjACBhY3NwQVBQTAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA9tYAAQAAAADTLWxjbXMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA1kZXNjAAABIAAAAEBjcHJ0AAABYAAAADZ3dHB0AAABmAAAABRjaGFkAAABrAAAACxyWFlaAAAB2AAAABRiWFlaAAAB7AAAABRnWFlaAAACAAAAABRyVFJDAAACFAAAACBnVFJDAAACFAAAACBiVFJDAAACFAAAACBjaHJtAAACNAAAACRkbW5kAAACWAAAACRkbWRkAAACfAAAACRtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACQAAAAcAEcASQBNAFAAIABiAHUAaQBsAHQALQBpAG4AIABzAFIARwBCbWx1YwAAAAAAAAABAAAADGVuVVMAAAAaAAAAHABQAHUAYgBsAGkAYwAgAEQAbwBtAGEAaQBuAABYWVogAAAAAAAA9tYAAQAAAADTLXNmMzIAAAAAAAEMQgAABd7///MlAAAHkwAA/ZD///uh///9ogAAA9wAAMBuWFlaIAAAAAAAAG+gAAA49QAAA5BYWVogAAAAAAAAJJ8AAA+EAAC2xFhZWiAAAAAAAABilwAAt4cAABjZcGFyYQAAAAAAAwAAAAJmZgAA8qcAAA1ZAAAT0AAACltjaHJtAAAAAAADAAAAAKPXAABUfAAATM0AAJmaAAAmZwAAD1xtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAEcASQBNAFBtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJWUDhMiQEAAC87wAsQNcCNbacOlLJ/CqB9hw5d24ae0QhJGBfwLpq2jeTx6bTbIyy+Y4S2bdvm0c39JvKYFzxmdP8ZuW3jSL5M3Xinv0FvV7dqwJe/l840ABkAt8f/+4IjxXzxPqBb3Z6TH5fAS6oG3oUfD49kzrBx4cxp9hEFuBoa2EuaKujM6Wq4vaK61V7i1NUwj8dTATrzDvL5vxrOnKL1D5VIDbyBzuTj0MCXSQRwpEStjpQ1xsQ4hVoBsnm3P1SGOZFFIhrLOmNi9hkHqJKNQwNV7JP4feJ7VzF/GqdE3klG5UMWSHWsg6wZxy9SRlRmpJo71Ghg/tAqdhboSLF9oBq+fkzERbOTmErialilWx2/2GlFnXkd5s2kCtF+8L0rxF46c6RUcftnSZAT7W9pHRtT7EPaTb73G3gC58+pMxnjpGfJ7rBniO67Z5FyJLA558ypgXXmcfV3+E6y98hTmfnNspGCvozW+TLy75w9jIm9fBlVUwCLdZO20lBIJYqiQPSfc7P9rLuveH0TAgA="
                message={"You ghosted this person.."}
                onButtonClick={() =>
                    Alerts.show({
                        title: "Are you sure you want to un-ghost this person?",
                        confirmText: "Yes!",
                        onConfirm: () => {
                            settings.store.users = parseUsers()
                                .filter(u => u !== channel.recipients[0])
                                .join(", ");
                        },
                        confirmColor: Button.Colors.GREEN,
                        body: <></>,
                    })
                }
            />
        );
    },
});

