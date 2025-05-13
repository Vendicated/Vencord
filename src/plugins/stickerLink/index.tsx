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

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import { copyWithToast } from "@utils/misc";
import definePlugin from "@utils/types";
import { findStoreLazy } from "@webpack";
import { Constants, FluxDispatcher, Menu, RestAPI } from "@webpack/common";

const StickersStore = findStoreLazy("StickersStore");

interface Sticker {
  t: "Sticker";
  description: string;
  format_type: number;
  guild_id: string;
  id: string;
  name: string;
  tags: string;
  type: number;
}

const StickerExt = [, "png", "png", "json", "gif"] as const;

function getUrl(id: string, formatType: number) {
  return new URL(
    `${window.GLOBAL_ENV.MEDIA_PROXY_ENDPOINT}/stickers/${id}.${StickerExt[formatType]}?size=4096&lossless=true`,
    location.toString()
  ).toString();
}


async function fetchSticker(id: string) {
  const cached = StickersStore.getStickerById(id);
  if (cached) return cached;

  const { body } = await RestAPI.get({
    url: Constants.Endpoints.STICKER(id)
  });

  FluxDispatcher.dispatch({
    type: "STICKER_FETCH_SUCCESS",
    sticker: body
  });

  return body as Sticker;
}

function buildMenuItem(fetchUrl: () => Promise<string> | string) {
  return (
    <Menu.MenuGroup>
      <Menu.MenuItem
        id="copy-sticker-link"
        key="copy-sticker-link"
        label="Copy Link"
        action={async () => copyWithToast(await fetchUrl())}
      />
      <Menu.MenuItem
        id="open-sticker-link"
        key="open-sticker-link"
        label="Open Link"
        action={async () => open(await fetchUrl())}
      />
    </Menu.MenuGroup>
  );
}


const messageContextMenuPatch: NavContextMenuPatchCallback = (children, props) => {
  const { favoriteableId, favoriteableType } = props ?? {};

  if (!favoriteableId || favoriteableType !== "sticker") return;

  const menuItem = (() => {
    switch (favoriteableType) {
      case "sticker":
        const sticker = props.message.stickerItems.find(s => s.id === favoriteableId);
        if (!sticker?.format_type) return;
        return buildMenuItem(() => getUrl(sticker.id, sticker.format_type));
    }
  })();

  if (menuItem)
    findGroupChildrenByChildId("copy-link", children)?.push(menuItem);
};

const expressionPickerPatch: NavContextMenuPatchCallback = (children, props: { target: HTMLElement; }) => {
  const { id, type } = props?.target?.dataset ?? {};
  if (!id) return;

  if (type === "sticker") {
    children.push(buildMenuItem(async () => {
      const sticker = await fetchSticker(id);
      return getUrl(sticker.id, sticker.format_type);
    }));
  }
};

export default definePlugin({
  name: "Sticker Link",
  description: "Allows you to open and copy sticker links like emojis",
  authors: [Devs.Commandtechno],
  contextMenus: {
    "message": messageContextMenuPatch,
    "expression-picker": expressionPickerPatch
  }
});
