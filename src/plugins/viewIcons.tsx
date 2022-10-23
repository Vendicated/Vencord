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
import { lazyWebpack, makeLazy } from "../utils/misc";
import { ModalRoot, ModalSize, openModal } from "../utils/modal";
import definePlugin from "../utils/types";
import { find } from "../webpack";
import { React } from "../webpack/common";

const ImageModal = lazyWebpack(m => m.prototype?.render?.toString().includes("OPEN_ORIGINAL_IMAGE"));
const getMaskedLink = makeLazy(() => find(m => m.type?.toString().includes("MASKED_LINK)")));

const OPEN_URL = "Vencord.Plugins.plugins.ViewIcons.openImage(";
export default definePlugin({
    name: "ViewIcons",
    authors: [Devs.Ven],
    description: "Makes Avatars/Banners in user profiles clickable, and adds Guild Context Menu Entries to View Banner/Icon.",

    openImage(url: string) {
        openModal(modalProps => (
            <ModalRoot size={ModalSize.DYNAMIC} {...modalProps}>
                <ImageModal
                    shouldAnimate={true}
                    original={url}
                    src={url}
                    renderLinkComponent={props => React.createElement(getMaskedLink(), props)}
                />
            </ModalRoot>
        ));
    },

    patches: [
        {
            find: "onAddFriend:",
            replacement: {
                // global because Discord has two components that are 99% identical with one small change ._.
                match: /\{src:(.{1,2}),avatarDecoration/g,
                replace: (_, src) => `{src:${src},onClick:()=>${OPEN_URL}${src}.replace(/\\?.+$/, "")+"?size=2048"),avatarDecoration`
            }
        }, {
            find: "().popoutNoBannerPremium",
            replacement: {
                match: /style:.{0,10}\{\},(.{1,2})\)/,
                replace: (m, style) => `onClick:${style}.backgroundImage&&(${style}.cursor="pointer",()=>${OPEN_URL}${style}.backgroundImage.replace("url(", "").replace(/(\\?size=.+)?\\)/, "?size=2048"))),${m}`
            }
        }, {
            find: '"GuildContextMenu:',
            replacement: [
                {
                    match: /\w=(\w)\.id/,
                    replace: (m, guild) => `_guild=${guild},${m}`
                },
                {
                    match: /(?<=createElement\((.{1,5}),\{id:"leave-guild".{0,100},)(.{1,2}\.createElement)\((.{1,5}),null,(.{1,2})\)(?=\)\}function)/,
                    replace: (_, menu, createElement, menuGroup, copyIdElement) =>
                        `${createElement}(${menuGroup},null,[` +
                        `_guild.icon&&${createElement}(${menu},` +
                        `{id:"viewicons-copy-icon",label:"View Icon",action:()=>${OPEN_URL}_guild.getIconURL(void 0,true)+"size=2048")}),` +
                        `_guild.banner&&${createElement}(${menu},` +
                        `{id:"viewicons-copy-banner",label:"View Banner",action:()=>${OPEN_URL}Vencord.Webpack.findByProps("getGuildBannerURL").getGuildBannerURL(_guild).replace(/\\?size=.+/, "?size=2048"))})`
                        + `,${copyIdElement}])`
                }
            ]
        }
    ]
});
