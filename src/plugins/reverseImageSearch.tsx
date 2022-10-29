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

import { Devs } from "../utils/constants";
import { lazyWebpack } from "../utils/misc";
import definePlugin from "../utils/types";
import { filters } from "../webpack";

const Engines = {
    Google: "https://www.google.com/searchbyimage?image_url=",
    Yandex: "https://yandex.com/images/search?rpt=imageview&url=",
    SauceNAO: "https://saucenao.com/search.php?url=",
    IQDB: "https://iqdb.org/?url=",
    TinEye: "https://www.tineye.com/search?url="
};

const Menu = lazyWebpack(filters.byProps(["MenuItem"]));


export default definePlugin({
    name: "ReverseImageSearch",
    description: "yes",
    authors: [Devs.Ven],
    dependencies: ["MenuItemDeobfuscatorApi"],
    patches: [{
        find: "open-native-link",
        replacement: {
            match: /key:"open-native-link".{0,200}\(\{href:(.{0,3}),.{0,200}\}\)/,
            replace: (m, src) =>
                `${m},Vencord.Plugins.plugins.ReverseImageSearch.makeMenu(${src})`
        }
    }],

    makeMenu(src: string) {
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
