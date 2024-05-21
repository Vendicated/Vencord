/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { findByPropsLazy, findStoreLazy, proxyLazyWebpack } from "@webpack";
import { EmojiStore, FluxDispatcher, lodash, Parser, UserSettingsActionCreators, UserStore } from "@webpack/common";
import type { Message } from "discord-types/general";
import type { ReactElement } from "react";

import { fakeNitroEmojiRegex, fakeNitroGifStickerRegex, fakeNitroStickerRegex, hyperLinkRegex } from "./regexes";
import { settings } from "./settings";
import { Sticker, StickerPack } from "./types";
import { clearEmptyArrayItems, ensureChildrenIsArray, trimContent } from "./utils";

export const StickerStore = findStoreLazy("StickersStore") as {
    getPremiumPacks(): StickerPack[];
    getAllGuildStickers(): Map<string, Sticker[]>;
    getStickerById(id: string): Sticker | undefined;
};

const UserSettingsProtoStore = findStoreLazy("UserSettingsProtoStore");
const ProtoUtils = findByPropsLazy("BINARY_READ_OPTIONS");

function searchProtoClassField(localName: string, protoClass: any) {
    const field = protoClass?.fields?.find((field: any) => field.localName === localName);
    if (!field) return;

    const fieldGetter = Object.values(field).find(value => typeof value === "function") as any;
    return fieldGetter?.();
}

const PreloadedUserSettingsActionCreators = proxyLazyWebpack(() => UserSettingsActionCreators.PreloadedUserSettingsActionCreators);
const AppearanceSettingsActionCreators = proxyLazyWebpack(() => searchProtoClassField("appearance", PreloadedUserSettingsActionCreators.ProtoClass));
const ClientThemeSettingsActionsCreators = proxyLazyWebpack(() => searchProtoClassField("clientThemeSettings", AppearanceSettingsActionCreators));

export function handleProtoChange(proto: any, user: any) {
    try {
        if (proto == null || typeof proto === "string") return;

        const premiumType: number = user?.premium_type ?? UserStore?.getCurrentUser()?.premiumType ?? 0;

        if (premiumType !== 2) {
            proto.appearance ??= AppearanceSettingsActionCreators.create();

            if (UserSettingsProtoStore.settings.appearance?.theme != null) {
                const appearanceSettingsDummy = AppearanceSettingsActionCreators.create({
                    theme: UserSettingsProtoStore.settings.appearance.theme
                });

                proto.appearance.theme = appearanceSettingsDummy.theme;
            }

            if (UserSettingsProtoStore.settings.appearance?.clientThemeSettings?.backgroundGradientPresetId?.value != null) {
                const clientThemeSettingsDummy = ClientThemeSettingsActionsCreators.create({
                    backgroundGradientPresetId: {
                        value: UserSettingsProtoStore.settings.appearance.clientThemeSettings.backgroundGradientPresetId.value
                    }
                });

                proto.appearance.clientThemeSettings ??= clientThemeSettingsDummy;
                proto.appearance.clientThemeSettings.backgroundGradientPresetId = clientThemeSettingsDummy.backgroundGradientPresetId;
            }
        }
    } catch (err) {
        new Logger("FakeNitro").error(err);
    }
}

export function handleGradientThemeSelect(backgroundGradientPresetId: number | undefined, theme: number, original: () => void) {
    const premiumType = UserStore?.getCurrentUser()?.premiumType ?? 0;
    if (premiumType === 2 || backgroundGradientPresetId == null) return original();

    if (!PreloadedUserSettingsActionCreators || !AppearanceSettingsActionCreators || !ClientThemeSettingsActionsCreators || !ProtoUtils) return;

    const currentAppearanceSettings = PreloadedUserSettingsActionCreators.getCurrentValue().appearance;

    const newAppearanceProto = currentAppearanceSettings != null
        ? AppearanceSettingsActionCreators.fromBinary(AppearanceSettingsActionCreators.toBinary(currentAppearanceSettings), ProtoUtils.BINARY_READ_OPTIONS)
        : AppearanceSettingsActionCreators.create();

    newAppearanceProto.theme = theme;

    const clientThemeSettingsDummy = ClientThemeSettingsActionsCreators.create({
        backgroundGradientPresetId: {
            value: backgroundGradientPresetId
        }
    });

    newAppearanceProto.clientThemeSettings ??= clientThemeSettingsDummy;
    newAppearanceProto.clientThemeSettings.backgroundGradientPresetId = clientThemeSettingsDummy.backgroundGradientPresetId;

    const proto = PreloadedUserSettingsActionCreators.ProtoClass.create();
    proto.appearance = newAppearanceProto;

    FluxDispatcher.dispatch({
        type: "USER_SETTINGS_PROTO_UPDATE",
        local: true,
        partial: true,
        settings: {
            type: 1,
            proto
        }
    });
}

export function patchFakeNitroEmojisOrRemoveStickersLinks(content: Array<any>, inline: boolean) {
    // If content has more than one child or it's a single ReactElement like a header, list or span
    if ((content.length > 1 || typeof content[0]?.type === "string") && !settings.store.transformCompoundSentence) return content;

    let nextIndex = content.length;

    const transformLinkChild = (child: ReactElement) => {
        if (settings.store.transformEmojis) {
            const fakeNitroMatch = child.props.href.match(fakeNitroEmojiRegex);
            if (fakeNitroMatch) {
                let url: URL | null = null;
                try {
                    url = new URL(child.props.href);
                } catch { }

                const emojiName = EmojiStore.getCustomEmojiById(fakeNitroMatch[1])?.name ?? url?.searchParams.get("name") ?? "FakeNitroEmoji";

                return Parser.defaultRules.customEmoji.react({
                    jumboable: !inline && content.length === 1 && typeof content[0].type !== "string",
                    animated: fakeNitroMatch[2] === "gif",
                    emojiId: fakeNitroMatch[1],
                    name: emojiName,
                    fake: true
                }, void 0, { key: String(nextIndex++) });
            }
        }

        if (settings.store.transformStickers) {
            if (fakeNitroStickerRegex.test(child.props.href)) return null;

            const gifMatch = child.props.href.match(fakeNitroGifStickerRegex);
            if (gifMatch) {
                // There is no way to differentiate a regular gif attachment from a fake nitro animated sticker, so we check if the StickerStore contains the id of the fake sticker
                if (StickerStore.getStickerById(gifMatch[1])) return null;
            }
        }

        return child;
    };

    const transformChild = (child: ReactElement) => {
        if (child?.props?.trusted != null) return transformLinkChild(child);
        if (child?.props?.children != null) {
            if (!Array.isArray(child.props.children)) {
                child.props.children = modifyChild(child.props.children);
                return child;
            }

            child.props.children = modifyChildren(child.props.children);
            if (child.props.children.length === 0) return null;
            return child;
        }

        return child;
    };

    const modifyChild = (child: ReactElement) => {
        const newChild = transformChild(child);

        if (newChild?.type === "ul" || newChild?.type === "ol") {
            ensureChildrenIsArray(newChild);
            if (newChild.props.children.length === 0) return null;

            let listHasAnItem = false;
            for (const [index, child] of newChild.props.children.entries()) {
                if (child == null) {
                    delete newChild.props.children[index];
                    continue;
                }

                ensureChildrenIsArray(child);
                if (child.props.children.length > 0) listHasAnItem = true;
                else delete newChild.props.children[index];
            }

            if (!listHasAnItem) return null;

            newChild.props.children = clearEmptyArrayItems(newChild.props.children);
        }

        return newChild;
    };

    const modifyChildren = (children: Array<ReactElement>) => {
        for (const [index, child] of children.entries()) children[index] = modifyChild(child);

        children = clearEmptyArrayItems(children);

        return children;
    };

    try {
        const newContent = modifyChildren(lodash.cloneDeep(content));
        trimContent(newContent);

        return newContent;
    } catch (err) {
        new Logger("FakeNitro").error(err);
        return content;
    }
}

export function patchFakeNitroStickers(stickers: Array<any>, message: Message) {
    const itemsToMaybePush: Array<string> = [];

    const contentItems = message.content.split(/\s/);
    if (settings.store.transformCompoundSentence) itemsToMaybePush.push(...contentItems);
    else if (contentItems.length === 1) itemsToMaybePush.push(contentItems[0]);

    itemsToMaybePush.push(...message.attachments.filter(attachment => attachment.content_type === "image/gif").map(attachment => attachment.url));

    for (const item of itemsToMaybePush) {
        if (!settings.store.transformCompoundSentence && !item.startsWith("http") && !hyperLinkRegex.test(item)) continue;

        const imgMatch = item.match(fakeNitroStickerRegex);
        if (imgMatch) {
            let url: URL | null = null;
            try {
                url = new URL(item);
            } catch { }

            const stickerName = StickerStore.getStickerById(imgMatch[1])?.name ?? url?.searchParams.get("name") ?? "FakeNitroSticker";
            stickers.push({
                format_type: 1,
                id: imgMatch[1],
                name: stickerName,
                fake: true
            });

            continue;
        }

        const gifMatch = item.match(fakeNitroGifStickerRegex);
        if (gifMatch) {
            if (!StickerStore.getStickerById(gifMatch[1])) continue;

            const stickerName = StickerStore.getStickerById(gifMatch[1])?.name ?? "FakeNitroSticker";
            stickers.push({
                format_type: 2,
                id: gifMatch[1],
                name: stickerName,
                fake: true
            });
        }
    }

    return stickers;
}
