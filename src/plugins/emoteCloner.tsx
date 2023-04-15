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
import { CheckedTextInput } from "@components/CheckedTextInput";
import { Devs } from "@utils/constants";
import Logger from "@utils/Logger";
import { Margins } from "@utils/margins";
import { ModalContent, ModalHeader, ModalRoot, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { findByCodeLazy, findByPropsLazy } from "@webpack";
import { Forms, GuildStore, Menu, PermissionStore, React, Toasts, Tooltip, UserStore } from "@webpack/common";

const MANAGE_EMOJIS_AND_STICKERS = 1n << 30n;

const GuildEmojiStore = findByPropsLazy("getGuilds", "getGuildEmoji");
const uploadEmoji = findByCodeLazy('"EMOJI_UPLOAD_START"', "GUILD_EMOJIS(");

function getGuildCandidates(isAnimated: boolean) {
    const meId = UserStore.getCurrentUser().id;

    return Object.values(GuildStore.getGuilds()).filter(g => {
        const canCreate = g.ownerId === meId ||
            BigInt(PermissionStore.getGuildPermissions({ id: g.id }) & MANAGE_EMOJIS_AND_STICKERS) === MANAGE_EMOJIS_AND_STICKERS;
        if (!canCreate) return false;

        const emojiSlots = g.getMaxEmojiSlots();
        const { emojis } = GuildEmojiStore.getGuilds()[g.id];

        let count = 0;
        for (const emoji of emojis)
            if (emoji.animated === isAnimated) count++;
        return count < emojiSlots;
    }).sort((a, b) => a.name.localeCompare(b.name));
}

async function doClone(guildId: string, id: string, name: string, isAnimated: boolean) {
    const data = await fetch(`${location.protocol}//${window.GLOBAL_ENV.CDN_HOST}/emojis/${id}.${isAnimated ? "gif" : "png"}`)
        .then(r => r.blob());
    const reader = new FileReader();

    reader.onload = () => {
        uploadEmoji({
            guildId,
            name: name.split("~")[0],
            image: reader.result
        }).then(() => {
            Toasts.show({
                message: `Successfully cloned ${name}!`,
                type: Toasts.Type.SUCCESS,
                id: Toasts.genId()
            });
        }).catch((e: any) => {
            new Logger("EmoteCloner").error("Failed to upload emoji", e);
            Toasts.show({
                message: "Oopsie something went wrong :( Check console!!!",
                type: Toasts.Type.FAILURE,
                id: Toasts.genId()
            });
        });
    };

    reader.readAsDataURL(data);
}

const getFontSize = (s: string) => {
    // [18, 18, 16, 16, 14, 12, 10]
    const sizes = [20, 20, 18, 18, 16, 14, 12];
    return sizes[s.length] ?? 4;
};

const nameValidator = /^\w+$/i;

function CloneModal({ id, name: emojiName, isAnimated }: { id: string; name: string; isAnimated: boolean; }) {
    const [isCloning, setIsCloning] = React.useState(false);
    const [name, setName] = React.useState(emojiName);

    const [x, invalidateMemo] = React.useReducer(x => x + 1, 0);

    const guilds = React.useMemo(() => getGuildCandidates(isAnimated), [isAnimated, x]);

    return (
        <>
            <Forms.FormTitle className={Margins.top20}>Custom Name</Forms.FormTitle>
            <CheckedTextInput
                value={name}
                onChange={setName}
                validate={v =>
                    (v.length > 1 && v.length < 32 && nameValidator.test(v))
                    || "Name must be between 2 and 32 characters and only contain alphanumeric characters"
                }
            />
            <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "1em",
                padding: "1em 0.5em",
                justifyContent: "center",
                alignItems: "center"
            }}>
                {guilds.map(g => (
                    <Tooltip text={g.name}>
                        {({ onMouseLeave, onMouseEnter }) => (
                            <div
                                onMouseLeave={onMouseLeave}
                                onMouseEnter={onMouseEnter}
                                role="button"
                                aria-label={"Clone to " + g.name}
                                aria-disabled={isCloning}
                                style={{
                                    borderRadius: "50%",
                                    backgroundColor: "var(--background-secondary)",
                                    display: "inline-flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    width: "4em",
                                    height: "4em",
                                    cursor: isCloning ? "not-allowed" : "pointer",
                                    filter: isCloning ? "brightness(50%)" : "none"
                                }}
                                onClick={isCloning ? void 0 : async () => {
                                    setIsCloning(true);
                                    doClone(g.id, id, name, isAnimated).finally(() => {
                                        invalidateMemo();
                                        setIsCloning(false);
                                    });
                                }}
                            >
                                {g.icon ? (
                                    <img
                                        aria-hidden
                                        style={{
                                            borderRadius: "50%",
                                            width: "100%",
                                            height: "100%",
                                        }}
                                        src={g.getIconURL(512, true)}
                                        alt={g.name}
                                    />
                                ) : (
                                    <Forms.FormText
                                        style={{
                                            fontSize: getFontSize(g.acronym),
                                            width: "100%",
                                            overflow: "hidden",
                                            whiteSpace: "nowrap",
                                            textAlign: "center",
                                            cursor: isCloning ? "not-allowed" : "pointer",
                                        }}
                                    >
                                        {g.acronym}
                                    </Forms.FormText>
                                )}
                            </div>
                        )}
                    </Tooltip>
                ))}
            </div>
        </>
    );
}

function buildMenuItem(id: string, name: string, isAnimated: boolean) {
    return (
        <Menu.MenuItem
            id="emote-cloner"
            key="emote-cloner"
            label="Clone Emote"
            action={() =>
                openModal(modalProps => (
                    <ModalRoot {...modalProps}>
                        <ModalHeader>
                            <img
                                role="presentation"
                                aria-hidden
                                src={`${location.protocol}//${window.GLOBAL_ENV.CDN_HOST}/emojis/${id}.${isAnimated ? "gif" : "png"}`}
                                alt=""
                                height={24}
                                width={24}
                                style={{ marginRight: "0.5em" }}
                            />
                            <Forms.FormText>Clone {name}</Forms.FormText>
                        </ModalHeader>
                        <ModalContent>
                            <CloneModal id={id} name={name} isAnimated={isAnimated} />
                        </ModalContent>
                    </ModalRoot>
                ))
            }
        />
    );
}

function isGifUrl(url: string) {
    return new URL(url).pathname.endsWith(".gif");
}

const messageContextMenuPatch: NavContextMenuPatchCallback = (children, props) => () => {
    const { favoriteableId, itemHref, itemSrc, favoriteableType } = props ?? {};

    if (!favoriteableId || favoriteableType !== "emoji") return;

    const match = props.message.content.match(RegExp(`<a?:(\\w+)(?:~\\d+)?:${favoriteableId}>|https://cdn\\.discordapp\\.com/emojis/${favoriteableId}\\.`));
    if (!match) return;
    const name = match[1] ?? "FakeNitroEmoji";

    const group = findGroupChildrenByChildId("copy-link", children);
    if (group) group.push(buildMenuItem(favoriteableId, name, isGifUrl(itemHref ?? itemSrc)));
};

const expressionPickerPatch: NavContextMenuPatchCallback = (children, props: { target: HTMLElement; }) => () => {
    const { id, name, type } = props?.target?.dataset ?? {};
    if (!id || !name || type !== "emoji") return;

    const firstChild = props.target.firstChild as HTMLImageElement;

    children.push(buildMenuItem(id, name, firstChild && isGifUrl(firstChild.src)));
};

export default definePlugin({
    name: "EmoteCloner",
    description: "Adds a Clone context menu item to emotes to clone them your own server",
    authors: [Devs.Ven, Devs.Nuckyz],
    dependencies: ["ContextMenuAPI"],

    start() {
        addContextMenuPatch("message", messageContextMenuPatch);
        addContextMenuPatch("expression-picker", expressionPickerPatch);
    },

    stop() {
        removeContextMenuPatch("message", messageContextMenuPatch);
        removeContextMenuPatch("expression-picker", expressionPickerPatch);
    }
});
