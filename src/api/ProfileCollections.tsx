/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Logger } from "@utils/Logger";
import { useEffect, useState } from "@webpack/common";
import type { ReactNode } from "react";

const logger = new Logger("ProfileCollectionAPI");

export type ProfileCollectionFactory = (props: any) => ReactNode | null;

interface CollectionEntry {
    render: ProfileCollectionFactory;
}

const profileCollections = new Map<string, CollectionEntry>();
const profileCollectionListeners = new Set<() => void>();

/**
 * Adds a collection to the user profile panel.
 *
 * @param id - Unique identifier for the collection (e.g., "my-plugin-profile-collection")
 * @param render - Function that returns the collection JSX. Receives the full profile props object.
 * @param priority - Higher values appear first. Default: 0
 *
 * @example
 * addProfileCollection("my-collection", (props) => (
 *     <div>Custom content for {props.user.id}</div>
 * ));
 */
export function addProfileCollection(id: string, render: ProfileCollectionFactory, priority = 0) {
    profileCollections.set(id, { render });
    profileCollectionListeners.forEach(listener => listener());
}

/**
 * Removes a collection from the user profile panel.
 *
 * @param id - The identifier used when adding the collection
 */
export function removeProfileCollection(id: string) {
    profileCollections.delete(id);
    profileCollectionListeners.forEach(listener => listener());
}

function ProfileCollections({ props }: { props: any; }) {
    const [, forceUpdate] = useState(0);

    useEffect(() => {
        const listener = () => forceUpdate(n => n + 1);
        profileCollectionListeners.add(listener);
        return () => { profileCollectionListeners.delete(listener); };
    }, []);

    return Array.from(profileCollections)
        .map(([id, { render: Collection }]) => (
            <ErrorBoundary noop key={id} onError={e => logger.error(`Failed to render profile collection: ${id}`, e.error)}>
                {Collection({ ...props, user: props.user ?? props.currentUser })}
            </ErrorBoundary>
        ));
}

/** @internal Injected by ProfileCollectionAPI patch (do NOT call directly) */
export function renderProfileCollections(props: any) {
    return <ProfileCollections props={props} />;
}
