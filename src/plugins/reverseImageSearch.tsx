/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addContextMenuPatch, findGroupChildrenByChildId, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { Flex } from "@components/Flex";
import { OpenExternalIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Menu } from "@webpack/common";

const Engines = {
    Google: "https://lens.google.com/uploadbyurl?url=",
    Yandex: "https://yandex.com/images/search?rpt=imageview&url=",
    SauceNAO: "https://saucenao.com/search.php?url=",
    IQDB: "https://iqdb.org/?url=",
    TinEye: "https://www.tineye.com/search?url=",
    ImgOps: "https://imgops.com/start?url="
} as const;

function search(src: string, engine: string) {
    open(engine + encodeURIComponent(src), "_blank");
}

const imageContextMenuPatch: NavContextMenuPatchCallback = (children, props) => () => {
    if (!props) return;
    const { reverseImageSearchType, itemHref, itemSrc } = props;

    if (!reverseImageSearchType || reverseImageSearchType !== "img") return;

    const src = itemHref ?? itemSrc;

    const group = findGroupChildrenByChildId("copy-link", children);
    if (group) {
        group.push((
            <Menu.MenuItem
                label="Search Image"
                key="search-image"
                id="search-image"
            >
                {Object.keys(Engines).map((engine, i) => {
                    const key = "search-image-" + engine;
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
                <Menu.MenuItem
                    key="search-image-all"
                    id="search-image-all"
                    label={
                        <Flex style={{ alignItems: "center", gap: "0.5em" }}>
                            <OpenExternalIcon height={16} width={16} />
                            All
                        </Flex>
                    }
                    action={() => Object.values(Engines).forEach(e => search(src, e))}
                />
            </Menu.MenuItem>
        ));
    }
};

export default definePlugin({
    name: "ReverseImageSearch",
    description: "Adds ImageSearch to image context menus",
    authors: [Devs.Ven, Devs.Nuckyz],
    tags: ["ImageUtilities"],

    patches: [
        {
            find: ".Messages.MESSAGE_ACTIONS_MENU_LABEL",
            replacement: {
                match: /favoriteableType:\i,(?<=(\i)\.getAttribute\("data-type"\).+?)/,
                replace: (m, target) => `${m}reverseImageSearchType:${target}.getAttribute("data-role"),`
            }
        }
    ],

    start() {
        addContextMenuPatch("message", imageContextMenuPatch);
    },

    stop() {
        removeContextMenuPatch("message", imageContextMenuPatch);
    }
});
