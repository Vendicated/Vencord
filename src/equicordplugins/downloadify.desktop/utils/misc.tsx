/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId } from "@api/ContextMenu";
import { Menu } from "@webpack/common";

import { InsertGroup, ParsedFile, ParsedURL } from "./definitions";

/**
 * Retrieve information about a file path by parsing its parts.
 */
export function parseFile(filePath: string): ParsedFile {
    const parts = filePath.split(/[\\/]/);
    let fileNameWithExtra = parts.pop() as string;

    while (fileNameWithExtra.includes("%25")) {
        fileNameWithExtra = decodeURIComponent(fileNameWithExtra);
    }

    fileNameWithExtra = decodeURIComponent(fileNameWithExtra);

    const posColon = fileNameWithExtra.indexOf(":");
    const fileNameWithoutExtra = posColon === -1 ? fileNameWithExtra : fileNameWithExtra.slice(0, posColon);
    const twitterExtra = posColon === -1 ? null : fileNameWithExtra.slice(posColon);

    const path = parts.join("/") + "/";
    const posDot = fileNameWithoutExtra.lastIndexOf(".");

    if (fileNameWithoutExtra === "" || posDot < 1) {
        return {
            path,
            baseName: fileNameWithoutExtra,
            extension: null,
            twitterExtra: null
        };
    }

    return {
        path,
        baseName: fileNameWithoutExtra.slice(0, posDot),
        extension: fileNameWithoutExtra.slice(posDot + 1).toLowerCase(),
        twitterExtra: twitterExtra ?? null
    };
}

/**
 * Retrieve information about a URL by parsing its parts.
 */
export function parseURL(url: string): ParsedURL {
    const parsed = new URL(url);
    const { path, baseName, extension, twitterExtra } = parseFile(parsed.pathname);
    const params = Array.from(parsed.searchParams.entries()).reduce(
        (acc, [key, value]) => {
            if (["ex", "is", "hm"].includes(key)) {
                acc.expiry[key] = value;
            } else {
                acc.other[key] = value;
            }

            return acc;
        }, { expiry: {}, other: {} } as { expiry: Record<string, string>, other: Record<string, string>; }
    );

    return {
        url: url,
        host: parsed.origin.toLowerCase(),
        path,
        baseName,
        extension,
        params,
        twitterExtra
    };
}

/**
 * Sanitize a file name by replacing invalid characters with underscores.
 */
export function sanitizeFilename(filename: string, allowUnicode: boolean, fallback?: string): string {
    let sanitized = filename.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_") // windows-reserved
        .replace(/^\./, "_") // dot files
        .replace(/(\.\.)+/g, "_") // relative paths
        .replace(/[ \t\n\r]+/g, "_"); // spaces

    if (!allowUnicode) {
        sanitized = sanitized.replace(/[^\x00-\x7F]/g, "_"); // non-ASCII characters
    } else {
        sanitized = sanitized.normalize("NFD"); // normalize unicode
    }

    sanitized = sanitized.replace(/^_+|_+$/g, ""); // leading and trailing underscores
    return sanitized || fallback || "";
}

/**
 * Get the current date and time formatted as a string.
 */
export function getFormattedNow(): string {
    return new Date().toLocaleString(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
    }).replace(",", "");
}

/**
 * Join or create a group in the guild context menu.
 */
export function joinOrCreateContextMenuGroup(
    children: Array<any>,
    items: Array<any>,
    groupId: string,
    submenuId?: string,
    submenuLabel?: string,
    insertOrder?: InsertGroup[]
) {
    function joinOrCreateSubmenu() {
        const existingItemShouldJoinSubmenu = existingGroup.props.children.find(child => child?.props?.submenuId === submenuId);
        let existingSubmenu = existingGroup.props.children.find(child => child?.props?.id === submenuId);
        let numitems = items.length;

        if (existingItemShouldJoinSubmenu) {
            existingSubmenu = null;
            items.unshift(existingItemShouldJoinSubmenu);
            numitems++;
            const indexOfExistingItemShouldJoinSubmenu = existingGroup.props.children.findIndex(child => child === existingItemShouldJoinSubmenu);
            existingGroup.props.children.splice(indexOfExistingItemShouldJoinSubmenu, 1);
        }

        if (existingSubmenu) {
            if (!Array.isArray(existingSubmenu.props.children)) {
                existingSubmenu.props.children = [existingSubmenu.props.children];
            }

            items.forEach(member => member.props.label = member.props.submenuItemLabel ?? member.props.label);
            existingSubmenu.props.children.push(...items);
        } else if (numitems === 1) {
            if (!chosenInsertOption?.position || chosenInsertOption.position === "END") {
                existingGroup.props.children.push(items[0]);
            } else {
                existingGroup.props.children.unshift(items[0]);
            }
        } else {
            existingSubmenu = (
                <Menu.MenuItem
                    id={submenuId as string}
                    label={submenuLabel}
                >
                    {[...items]}
                </Menu.MenuItem>
            );

            items.forEach(member => member.props.label = member.props.submenuItemLabel ?? member.props.label);

            if (!chosenInsertOption?.position || chosenInsertOption.position === "END") {
                existingGroup.props.children.push(existingSubmenu);
            } else {
                existingGroup.props.children.unshift(existingSubmenu);
            }
        }
    }

    items.forEach(member => {
        member.props.groupId = groupId;
        member.props.submenuId = submenuId;
        member.props.submenuLabel = submenuLabel;
    });

    const insertWithOptions = insertOrder?.filter(item => item.type === "WITH_GROUP");
    let existingGroup = children.find(child => child?.props?.id === groupId);
    let chosenInsertOption;

    if (!existingGroup && insertWithOptions) {
        let targetItem;

        for (const item of insertWithOptions) {
            if (item.id.group) {
                targetItem = children.find(child => child?.props?.id === item.id.group);
            }

            if (!targetItem && item.id.child) {
                targetItem = findGroupChildrenByChildId(item.id.child, children, true);
            }

            if (targetItem) {
                existingGroup = children.find(child => child?.props?.children === targetItem);
                chosenInsertOption = item;
                break;
            }
        }
    }

    if (existingGroup) {
        if (!Array.isArray(existingGroup.props.children)) {
            existingGroup.props.children = [existingGroup.props.children];
        }

        if (!submenuId) {
            if (!chosenInsertOption?.position || chosenInsertOption.position === "END") {
                existingGroup.props.children.push(...items);
            } else {
                existingGroup.props.children.unshift(...items);
            }

            return;
        } else {
            joinOrCreateSubmenu();
        }
    } else {
        if (!submenuId) {
            existingGroup = (
                <Menu.MenuGroup id={groupId}>
                    {[...items]}
                </Menu.MenuGroup>
            );
        } else {
            existingGroup = (<Menu.MenuGroup id={groupId}>{[]}</Menu.MenuGroup>);
            joinOrCreateSubmenu();
        }

        const insertAfterBeforeOptions = insertOrder?.filter(item => item.type !== "WITH_GROUP") || [];
        let targetIndex = children.length;
        let targetItem;

        for (const item of insertAfterBeforeOptions) {
            if (item.id.group) {
                targetItem = children.find(child => child?.props?.id === item.id.group);
            }

            if (!targetItem && item.id.child) {
                targetItem = findGroupChildrenByChildId(item.id.child, children, true);
            }

            if (targetItem) {
                targetIndex = children.findIndex(child => child?.props?.children === targetItem);

                if (item.type === "AFTER_GROUP") {
                    targetIndex++;
                }

                break;
            }
        }

        children.splice(targetIndex, 0, existingGroup);
    }
}
