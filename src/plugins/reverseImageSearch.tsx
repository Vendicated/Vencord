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

import { addContextMenuPatch, findGroupChildrenByChildId, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
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
};

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
                {Object.keys(Engines).map(engine => {
                    const key = "search-image-" + engine;
                    return (
                        <Menu.MenuItem
                            key={key}
                            id={key}
                            label={engine}
                            action={() => search(src, Engines[engine])}
                        />
                    );
                })}
                <Menu.MenuItem
                    key="search-image-all"
                    id="search-image-all"
                    label="All"
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
    dependencies: ["ContextMenuAPI"],
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
