/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Logger } from "@utils/Logger";
import { useEffect, useState } from "@webpack/common";
import type { ReactNode } from "react";

const logger = new Logger("ProfileSectionsAPI");

export type ProfileSectionFactory = (props: { userId: string; isSideBar: boolean; }) => ReactNode | Promise<ReactNode> | null;

export interface ProfileSectionData {
    render: ProfileSectionFactory;
    priority: number;
}

const profileSections = new Map<string, ProfileSectionData>();
const profileSectionListeners = new Set<() => void>();

/**
 * Adds a section to the user profile panel near the 'Member Since' area.
 *
 * @param id       - Unique identifier for the section (e.g., "my-plugin-profile-section")
 * @param render   - Function that returns the section JSX.
 *                   Receives `{ userId, isSideBar }` so you can style accordingly.
 * @param priority - Higher values appear first. Default: 0
 *
 * @example
 * addProfileSection("my-section", ({ userId, isSideBar }) => (
 *     <div>Custom content for {userId}</div>
 * ));
 */
export function addProfileSection(id: string, render: ProfileSectionFactory, priority = 0) {
    profileSections.set(id, { render, priority });
    profileSectionListeners.forEach(listener => listener());
}

/**
 * Removes a section from the user profile panel.
 *
 * @param id - The identifier used when adding the section
 */
export function removeProfileSection(id: string) {
    profileSections.delete(id);
    profileSectionListeners.forEach(listener => listener());
}

function ProfileSections({ userId, isSideBar }: { userId: string; isSideBar: boolean; }) {
    const [, forceUpdate] = useState(0);

    useEffect(() => {
        const listener = () => forceUpdate(n => n + 1);
        profileSectionListeners.add(listener);
        return () => { profileSectionListeners.delete(listener); };
    }, []);

    return Array.from(profileSections)
        .sort(([, a], [, b]) => b.priority - a.priority)
        .map(([id, { render: Section }]) => (
            <ErrorBoundary noop key={id} onError={e => logger.error(`Failed to render profile section: ${id}`, e.error)}>
                <Section userId={userId} isSideBar={isSideBar} />
            </ErrorBoundary>
        ));
}

/** @internal Injected by ProfileSectionsAPI patch (do NOT call directly) */
export function renderProfileSections(props: { userId: string; isSideBar: boolean; }) {
    return <ProfileSections {...props} />;
}
