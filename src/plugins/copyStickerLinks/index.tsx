/*
* Vencord, a modification for Discord's desktop app
* Copyright (c) 2025 Vendicated and contributors
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

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import { copyWithToast } from "@utils/misc";
import definePlugin from "@utils/types";
import { findStoreLazy } from "@webpack";
import { Menu, React } from "@webpack/common";
import { Promisable } from "type-fest";

const StickersStore = findStoreLazy("StickersStore");

interface Sticker {
   t: "Sticker";
   format_type: number;
   id: string;
   type: number;
}

const StickerExt = [, "png", "png", "json", "gif"] as const;

function getUrl(data: Sticker) {
   if (data.format_type === 4)
       return `https:${window.GLOBAL_ENV.MEDIA_PROXY_ENDPOINT}/stickers/${data.id}.gif?size=4096&lossless=true`;

   return `https://${window.GLOBAL_ENV.CDN_HOST}/stickers/${data.id}.${StickerExt[data.format_type]}?size=4096&lossless=true`;
}

function buildMenuItem(Sticker, fetchData: () => Promisable<Omit<Sticker, "t">>) {
   return (
       <>
           <Menu.MenuSeparator></Menu.MenuSeparator>

           <Menu.MenuItem
               id="copystickerurl"
               key="copystickerurl"
               label={"Copy URL"}
               action={async () => {
                   const res = await fetchData();
                   const data = { t: Sticker, ...res } as Sticker;
                   const url = getUrl(data[0]);
                   copyWithToast(url, "Link copied!");
               }
               }
           />

           <Menu.MenuItem
               id="openstickerlink"
               key="openstickerlink"
               label={"Open URL"}
               action={async () => {
                   const res = await fetchData();
                   const data = { t: Sticker, ...res } as Sticker;
                   const url = getUrl(data[0]);
                   VencordNative.native.openExternal(url);
               }
               }
           />
       </>
   );
}

function buildMenuExpression(Sticker, fetchData: () => Promisable<Omit<Sticker, "t">>) {
   return (
       <>
           <Menu.MenuSeparator></Menu.MenuSeparator>
           <Menu.MenuItem
               id="copystickerurl"
               key="copystickerurl"
               label={"Copy URL"}
               action={async () => {
                   const res = await fetchData();
                   const data = { t: Sticker, ...res } as Sticker;
                   const url = getUrl(data);
                   copyWithToast(url, "Link copied!");
               }
               }
           />
           <Menu.MenuItem
               id="openstickerlink"
               key="openstickerlink"
               label={"Open URL"}
               action={async () => {
                   const res = await fetchData();
                   const data = { t: Sticker, ...res } as Sticker;
                   const url = getUrl(data);
                   VencordNative.native.openExternal(url);
               }
               }
           />
       </>
   );
}

const messageContextMenuPatch: NavContextMenuPatchCallback = (children, props) => {
   const { favoriteableId, favoriteableType } = props ?? {};
   if (!favoriteableId) return;
   const menuItem = (() => {
       const sticker = props.message.stickerItems.find(s => s.id === favoriteableId);
       if (sticker?.format_type === 3) return;
       switch (favoriteableType) {
           case "sticker":
               return buildMenuItem("Sticker", () => props.message.stickerItems);
       }
   })();

   if (menuItem)
       findGroupChildrenByChildId("devmode-copy-id", children, true)?.push(menuItem);
};

const expressionPickerPatch: NavContextMenuPatchCallback = (children, props: { target: HTMLElement; }) => {
   const { id } = props?.target?.dataset ?? {};
   if (!id) return;

   if (!props.target.className?.includes("lottieCanvas")) {
       const stickerCache = StickersStore.getStickerById(id);
       if (stickerCache) {
           children.push(buildMenuExpression("Sticker", () => stickerCache));
       }
   }
};

export default definePlugin({
   name: "CopyStickerLinks",
   description: "Adds the ability to copy and open sticker links to your browser",
   authors: [Devs.Byeoon],
   contextMenus: {
       "message": messageContextMenuPatch,
       "expression-picker": expressionPickerPatch
   }
});
