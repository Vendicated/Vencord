/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

type RouteData = {
    path: string,
    render: (props?: any) => JSX.Element,
    disableTrack: 1 | 0;
    redirectTo?: string;
};

type NavigationSettings = {
    /** Transition to a route */
    transitionTo: (path: string) => unknown,
    getHistory: () => {
        location: {
            /** The current route */
            pathname: string;
        };
    },
};
