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

export default definePlugin({
    name: "ReverseImageSearch",
    description: "Adds ImageSearch to image context menus",
    authors: [Devs.Ven, Devs.Nuckyz],
    dependencies: ["MenuItemDeobfuscatorAPI"],
    patches: [
        {
            find: ".Messages.MESSAGE_ACTIONS_MENU_LABEL",
            replacement: [
                {
                    match: /(?<=(?<target>\i)\.getAttribute\("data-type"\).+?favoriteableType:\i,)/,
                    replace: 'reverseImageSearchType:$<target>.getAttribute("data-role"),'
                },
                {
                    match: /var \i=(?<props>\i)\.message,\i=\i\.channel,\i=\i\.textSelection,\i=\i\.favoriteableType.+?(?<itemHref>\i)=\i\.itemHref,(?<itemSrc>\i)=\i\.itemSrc.+?]}\)}/,
                    replace: (mod, props, itemHref, itemSrc) => {
                        mod = mod.replace(RegExp(`(?<=${props}\\.navId,)`), `reverseImageSearchType=${props}.reverseImageSearchType,`);
                        const targetItems = mod.match(RegExp(`(?<=,).{1,2}(?==\\(0,.{1,2}\\..{1,2}\\)\\(null!=${itemHref})`));

                        if (targetItems) {
                            mod = mod.replace(RegExp(`(?<=children:${targetItems[0]})`), `.concat(Vencord.Plugins.plugins.ReverseImageSearch.makeMenu(${itemHref}??${itemSrc},reverseImageSearchType)).filter(Boolean)`);
                        }

                        return mod;
                    }
                }
            ]
        }
    ],

    makeMenu(src: string, type: string) {
        if (type !== "img") return null;

        return (
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
                            action={() => this.search(src, Engines[engine])}
                        />
                    );
                })}
                <Menu.MenuItem
                    key="search-image-all"
                    id="search-image-all"
                    label="All"
                    action={() => Object.values(Engines).forEach(e => this.search(src, e))}
                />
            </Menu.MenuItem>
        );
    },

    // openUrl is a mangled export, so just match it in the module and pass it
    search(src: string, engine: string) {
        open(engine + encodeURIComponent(src), "_blank");
    }
});
