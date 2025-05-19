/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { OpenBookmarksButton } from "./components/OpenBookmarksButton";
import { patchContextMenu, unpatchContextMenu } from "./patches/contextMenu";

const BookmarkHeaderButton = () => (
    <ErrorBoundary noop={true} key="bookmark-button">
        <OpenBookmarksButton />
    </ErrorBoundary>
);

export default definePlugin({
    name: "MessageBookmarks",
    description: "Globally bookmark messages and view them using the top right button.",
    authors: [Devs.zolu],

    patches: [
        {
            find: "toolbar:function",
            replacement: {
                match: /(function \i\(\i\){)(.{1,200}toolbar.{1,100}mobileToolbar)/,
                replace: "$1$self.addIconToToolBar(arguments[0]);$2"
            }
        }
    ],

    addIconToToolBar(e: { toolbar: React.ReactNode[] | React.ReactNode; }) {
        if (Array.isArray(e.toolbar)) {
            e.toolbar.unshift(<BookmarkHeaderButton />);
        } else {
            e.toolbar = [<BookmarkHeaderButton />, e.toolbar];
        }
    },

    start() {
        patchContextMenu();
    },

    stop() {
        unpatchContextMenu();
    }
});
