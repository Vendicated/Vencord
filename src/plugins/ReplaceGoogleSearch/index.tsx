/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addContextMenuPatch, findGroupChildrenByChildId, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { Flex } from "@components/Flex";
import { OpenExternalIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Menu, Toasts } from "@webpack/common";

const Engines = {
    Google: "https://www.google.com/search?q=",
    DuckDuckGo: "https://duckduckgo.com/",
    Bing: "https://www.bing.com/search?q=",
    Yahoo: "https://search.yahoo.com/search?p=",
    Yandex: "https://yandex.com/search/?text=",
    AOL: "https://search.aol.com/aol/search?q=",
    BaiDu: "https://www.baidu.com/s?wd=",
    Wikipidia: "https://wikipedia.org/w/index.php?search="
} as const;

function search(src: string, engine: string) {
    if (!src) {
        Toasts.show({
            message: "This message has no content. Did not search.",
            type: Toasts.Type.FAILURE,
            id: Toasts.genId(),
            options: {
                duration: 3000
            }
        });

        return;
    }

    open(engine + encodeURIComponent(src), "_blank");
}

function makeSearchItem(src: string) {
    return (
        <Menu.MenuItem
            label="Search Content"
            key="search-content"
            id="search-content"
        >
            {Object.keys(Engines).map((engine, i) => {
                const key = "search-content-" + engine;
                return (
                    <Menu.MenuItem
                        key={key}
                        id={key}
                        label={
                            <Flex style={{ alignItems: "center", gap: "0.5em" }}>
                                <img
                                    style={{
                                        borderRadius: i >= 3 // Do not round Google, Yandex & SauceNAO
                                            ? "50%"
                                            : void 0
                                    }}
                                    aria-hidden="true"
                                    height={16}
                                    width={16}
                                    src={new URL("/favicon.ico", Engines[engine]).toString().replace("lens.", "")}
                                />
                                {engine}
                            </Flex>
                        }
                        action={() => search(src, Engines[engine])}
                    />
                );
            })}
        </Menu.MenuItem>
    );
}

const messageContextMenuPatch: NavContextMenuPatchCallback = (children, props) => () => {
    const group = findGroupChildrenByChildId("copy-link", children);
    const message = props.message.content;

    group?.push(makeSearchItem(message));
};

export default definePlugin({
    name: "ReplaceGoogleSearch",
    authors: [Devs.Moxxie,Devs.Ethan],
    description: "Allows you to search messages in diffrent search engines!",

    start() {
        addContextMenuPatch("message", messageContextMenuPatch);
        addContextMenuPatch("channel-context", messageContextMenuPatch);
    },

    stop() {
        removeContextMenuPatch("message", messageContextMenuPatch);
        removeContextMenuPatch("channel-context", messageContextMenuPatch);
    }
});
