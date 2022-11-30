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
    Google: "https://www.google.com/searchbyimage?image_url=",
    Yandex: "https://yandex.com/images/search?rpt=imageview&url=",
    SauceNAO: "https://saucenao.com/search.php?url=",
    IQDB: "https://iqdb.org/?url=",
    TinEye: "https://www.tineye.com/search?url="
};

export default definePlugin({
    name: "ReverseImageSearch",
    description: "Adds ImageSearch to image context menus",
    authors: [Devs.Ven],
    dependencies: ["MenuItemDeobfuscatorAPI"],
    patches: [{
        find: "open-native-link",
        replacement: {
            match: /id:"open-native-link".{0,200}\(\{href:(.{0,3}),.{0,200}\},"open-native-link"\)/,
            replace: (m, src) =>
                `${m},Vencord.Plugins.plugins.ReverseImageSearch.makeMenu(${src}, arguments[2])`
        }
    }, {
        // pass the target to the open link menu so we can check if it's an image
        find: "REMOVE_ALL_REACTIONS_CONFIRM_BODY,",
        replacement: {
            // url1 = url2 = props.attachment.url
            // ...
            // OpenLinks(url2 != null ? url2 : url1, someStuffs)
            //
            // the back references are needed because the code is like Z(a!=null?b:c,d), no way to match that
            // otherwise
            match: /(?<props>.).onHeightUpdate.{0,200}(.)=(.)=.\.url;.+?\(null!=\3\?\3:\2[^)]+/,
            replace: "$&,$<props>.target"
        }
    }],

    makeMenu(src: string, target: HTMLElement) {
        if (target && !(target instanceof HTMLImageElement) && target.attributes["data-role"]?.value !== "img")
            return null;

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
