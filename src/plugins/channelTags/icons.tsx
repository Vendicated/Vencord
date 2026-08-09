/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DeleteIcon as ComponentsDeleteIcon, PencilIcon as ComponentsPencilIcon } from "@components/Icons";

const SIZE = 20;

export function ViewIcon() {
    return (
        <svg aria-hidden="true" width={SIZE} height={SIZE} viewBox="0 0 24 24">
            <path fill="currentColor" d="M12 5c5.5 0 9.5 5.1 9.7 5.3a2.7 2.7 0 0 1 0 3.4C21.5 13.9 17.5 19 12 19s-9.5-5.1-9.7-5.3a2.7 2.7 0 0 1 0-3.4C2.5 10.1 6.5 5 12 5Zm0 2c-4.2 0-7.5 3.8-8.1 5 .6 1.2 3.9 5 8.1 5s7.5-3.8 8.1-5c-.6-1.2-3.9-5-8.1-5Zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" />
        </svg>
    );
}

export function JumpIcon() {
    return (
        <svg aria-hidden="true" width={SIZE} height={SIZE} viewBox="0 0 24 24">
            <path fill="currentColor" d="M13.3 5.3a1 1 0 0 1 1.4 0l6 6a1 1 0 0 1 0 1.4l-6 6a1 1 0 1 1-1.4-1.4L17.6 13H4a1 1 0 1 1 0-2h13.6l-4.3-4.3a1 1 0 0 1 0-1.4Z" />
        </svg>
    );
}

export function TagsIcon() {
    return (
        <svg aria-hidden="true" width={SIZE} height={SIZE} viewBox="0 0 24 24">
            <path fill="currentColor" d="M3 5a2 2 0 0 1 2-2h6.2a2 2 0 0 1 1.4.6l7.8 7.8a2 2 0 0 1 0 2.8l-6.2 6.2a2 2 0 0 1-2.8 0l-7.8-7.8A2 2 0 0 1 3 11.2V5Zm4 1.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
        </svg>
    );
}

export const PencilIcon = () => (<ComponentsPencilIcon width={SIZE} height={SIZE} />);
export const DeleteIcon = () => (<ComponentsDeleteIcon width={SIZE} height={SIZE} />);
