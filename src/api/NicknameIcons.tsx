/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Logger } from "@utils/Logger";
import { ReactNode } from "react";

export interface NicknameIconProps {
    userId: string;
}

export type NicknameIconFactory = (props: NicknameIconProps) => ReactNode | Promise<ReactNode>;

export interface NicknameIcon {
    priority: number;
    factory: NicknameIconFactory;
}

const nicknameIcons = new Map<string, NicknameIcon>();
const logger = new Logger("NicknameIcons");

export function addNicknameIcon(id: string, factory: NicknameIconFactory, priority = 0) {
    return nicknameIcons.set(id, {
        priority,
        factory: ErrorBoundary.wrap(factory, { noop: true, onError: error => logger.error(`Failed to render ${id}`, error) })
    });
}

export function removeNicknameIcon(id: string) {
    return nicknameIcons.delete(id);
}

export function _renderIcons(props: NicknameIconProps) {
    return Array.from(nicknameIcons)
        .sort((a, b) => b[1].priority - a[1].priority)
        .map(([id, { factory: NicknameIcon }]) => <NicknameIcon key={id} {...props} />);
}
