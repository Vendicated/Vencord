/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getCurrentGuild } from "@utils/discord";
import { Alerts, Forms } from "@webpack/common";
import type { ReactElement } from "react";

import { settings } from "../settings";

export const getCurrentGuildId = () => getCurrentGuild()?.id;

export const trimContent = (content: Array<any>) => {
    const firstContent = content[0];
    if (typeof firstContent === "string") {
        content[0] = firstContent.trimStart();
        content[0] || content.shift();
    } else if (typeof firstContent?.props?.children === "string") {
        firstContent.props.children = firstContent.props.children.trimStart();
        firstContent.props.children || content.shift();
    }

    const lastIndex = content.length - 1;
    const lastContent = content[lastIndex];
    if (typeof lastContent === "string") {
        content[lastIndex] = lastContent.trimEnd();
        content[lastIndex] || content.pop();
    } else if (typeof lastContent?.props?.children === "string") {
        lastContent.props.children = lastContent.props.children.trimEnd();
        lastContent.props.children || content.pop();
    }
};
export const clearEmptyArrayItems = (array: Array<any>) => array.filter(item => item != null);
export const ensureChildrenIsArray = (child: ReactElement) => {
    if (!Array.isArray(child.props.children)) child.props.children = [child.props.children];
};

export const getWordBoundary = (origStr: string, offset: number) => (!origStr[offset] || /\s/.test(origStr[offset])) ? "" : " ";

export function cannotEmbedNotice() {
    return new Promise<boolean>(resolve => {
        Alerts.show({
            title: "Hold on!",
            body: <div>
                <Forms.FormText>
                        You are trying to send/edit a message that contains a FakeNitro emoji or sticker,
                however you do not have permissions to embed links in the current channel.
                    Are you sure you want to send this message? Your FakeNitro items will appear as a link only.
                </Forms.FormText>
                <Forms.FormText type={Forms.FormText.Types.DESCRIPTION}>
            You can disable this notice in the plugin settings.
                </Forms.FormText>
            </div>,
            confirmText: "Send Anyway",
            cancelText: "Cancel",
            secondaryConfirmText: "Do not show again",
            onConfirm: () => resolve(true),
            onCloseCallback: () => setImmediate(() => resolve(false)),
            onConfirmSecondary() {
                settings.store.disableEmbedPermissionCheck = true;
                resolve(true);
            }
        });
    });
}
