/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { findGroupChildrenByChildId, type NavContextMenuPatchCallback } from "@api/ContextMenu";
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

const makeSearchItem = (src: string) => (
    <Menu.MenuItem
        label="Search Image"
        key="search-image"
        id="search-image"
    >
        {(Object.keys(Engines) as (keyof typeof Engines)[]).map((engine, i) => {
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
                                        : undefined
                                }}
                                aria-hidden="true"
                                height={16}
                                width={16}
                                src={new URL("/favicon.ico", Engines[engine]).toString().replace("lens.", "")}
                            />
                            {engine}
                        </Flex>
                    }
                    action={() => { search(src, Engines[engine]); }}
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
            action={() => { Object.values(Engines).forEach(e => { search(src, e); }); }}
        />
    </Menu.MenuItem>
);

const messageContextMenuPatch = ((children, props) => {
    if (props?.reverseImageSearchType !== "img") return;

    const src = props.itemHref ?? props.itemSrc;

    const group = findGroupChildrenByChildId("copy-link", children);
    group?.push(makeSearchItem(src));
}) satisfies NavContextMenuPatchCallback;

const imageContextMenuPatch = ((children, props) => {
    if (!props?.src) return;

    const group = findGroupChildrenByChildId("copy-native-link", children) ?? children;
    group.push(makeSearchItem(props.src));
}) satisfies NavContextMenuPatchCallback;

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
    contextMenus: {
        "message": messageContextMenuPatch,
        "image-context": imageContextMenuPatch
    }
});
