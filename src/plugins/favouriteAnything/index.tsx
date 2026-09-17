/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { getIntlMessage } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { ComponentType, ReactNode } from "react";

import { AttachmentAccessory, AttachmentContextProvider, EmbedAccessory, EmbedContext, EmbedMosaicContext, FilePicker } from "./components";
import { SignedUrlsStore } from "./stores";
import managedStyle from "./style.css?managed";
import { AttachmentContextProviderProps, EmbedComponent, ExpressionPickerTabProps, ExpressionPickerView, FavouriteItem, FavouriteItemFormat, FullFavouriteItem } from "./types";

export const settings = definePluginSettings({
    localThumbnails: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Generate file thumbnails locally instead of using an external service (placeholder.nin0.dev). Not compatible with mobile. Toggling this option will not affect existing favourites.",
    }
});

export default definePlugin({
    name: "FavouriteAnything",
    description: "Favourite any image, video, or file attachment",
    tags: ["Chat", "Media", "Utility"],
    authors: [Devs.Davri, Devs.nin0dev],
    searchTerms: ["favorite"],
    managedStyle,
    settings,
    patches: [
        // EMBEDS
        {
            find: "this.renderInlineMediaEmbed",
            replacement: [
                {
                    // Wrap the embed component's render method in a custom context to avoid having to drill props
                    match: "render()",
                    replace: "$&{return $self.renderEmbed(this)}__render()"
                },
                {
                    // Specify the index for individual items in embed.images
                    match: /\.images\.map\((\i)=>(this.renderImage\(\{[^}]{50,100}\}\))\)/,
                    replace: ".images.map(($1,index)=>$self.renderEmbedMosaicItem($2,index))"
                }
            ]
        },
        {
            // Override the default renderAdjacentContent prop value for all types of embed components (renderImageComponent, renderVideoComponent...)
            find: "#{intl::MEDIA_MOSAIC_ALT_TEXT_POPOUT_TITLE}",
            replacement: {
                match: /renderAdjacentContent:\i/g,
                replace: "$&=$self.renderEmbedAccessory"
            }
        },
        // ATTACHMENTS
        {
            find: '["VIDEO","CLIP","AUDIO"]',
            replacement: [
                {
                    // Wrap the attachment component in a custom context to avoid having to drill props
                    match: /(?<=children:)(\i)=>(\i\(\1\))\}\):(\i\(\))/,
                    replace: "$1=>$self.renderAttachment($2,arguments[0])}):$self.renderAttachment($3,arguments[0])"
                },
                {
                    // Always add our custom accessory to the attachment's adjacent content
                    match: /let \i=Math.max\(0,(\i)\.length-\i\)/,
                    replace: "$1.unshift($self.renderAttachmentAccessory());$&"
                }
            ]
        },
        // COMPONENTS V2
        {
            // Handle the FILE message component separately since it has different props from the standard attachment component
            find: "#{intl::ATTACHMENT_FILENAME_UNKNOWN}",
            replacement: {
                match: /(?<=case \i\.\i\.FILE:)return(\(0,\i\.jsx\)\(\i,\{\.\.\.(\i)\},(\i)\))/,
                replace: "return $self.renderCV2File($1,$3,$2)"
            }
        },
        // EXPRESSION PICKER
        {
            find: "#{intl::EXPRESSION_PICKER_CATEGORIES_A11Y_LABEL}",
            replacement: [
                {
                    // Replace the "GIFs" tab with two custom tabs
                    match: /\(0,\i\.jsx\)\((\i),[^}]{20,40}?"aria-selected":(\i)[^}]{50,100}?#{intl::EXPRESSION_PICKER_GIF}\)\}\)/,
                    replace: "$self.renderTabs($1,$2)"
                },
                {
                    // Insert the custom file picker into the expression picker's body
                    match: /\{onSelectGIF:(\i),[^}]{20,40}\}\):null,(?=(\i)===)/,
                    replace: "$&$self.renderFilePicker($2,$1),"
                }
            ]
        },
        {
            // Hide favourite files from the GIFs/Media tab
            find: '.sortBy("order").reverse().value()',
            replacement: {
                match: '.sortBy("order").reverse()',
                replace: "$&.filter($self.filterGifs)"
            }
        },
        // PROTOBUF
        {
            find: "#{intl::FAVORITE_GIFS_LIMIT_REACHED_BODY}",
            replacement: {
                // Intercept add/remove actions to generate a valid thumbnail url before storing the item
                match: /function (\i)\((\i)\)\{(?=\i\.\i\.updateAsync\("favoriteGifs")/g,
                replace: "async function $1($2){await $self.fixFavItem($2);await "
            }
        }
    ],
    renderTabs(Tab: ComponentType<ExpressionPickerTabProps>, activeView: ExpressionPickerView) {
        return (
            <>
                <Tab
                    id="gif-picker-tab"
                    key="gif-picker-tab"
                    aria-controls="gif-picker-tab-panel"
                    aria-selected={activeView === ExpressionPickerView.GIF}
                    isActive={activeView === ExpressionPickerView.GIF}
                    viewType={ExpressionPickerView.GIF}
                >
                    {getIntlMessage("QUICKSEARCH_MEDIA")}
                </Tab>
                <Tab
                    id="files-picker-tab"
                    key="files-picker-tab"
                    aria-controls="files-picker-tab-panel"
                    aria-selected={activeView === ExpressionPickerView.FILES}
                    isActive={activeView === ExpressionPickerView.FILES}
                    viewType={ExpressionPickerView.FILES}
                >
                    {getIntlMessage("QUICKSEARCH_FILES")}
                </Tab>
            </>
        );
    },
    renderFilePicker(activeView: ExpressionPickerView, onSelectGIF: (item: { url: string; }) => void) {
        return activeView === ExpressionPickerView.FILES ? <FilePicker onSelectItem={onSelectGIF} /> : null;
    },
    renderAttachment(children: ReactNode, { item }: { item: AttachmentContextProviderProps["attachment"]; }) {
        return <AttachmentContextProvider attachment={item}>{children}</AttachmentContextProvider>;
    },
    renderCV2File(children: ReactNode, key: React.Key, component: AttachmentContextProviderProps["component"]) {
        return <AttachmentContextProvider component={component} key={key}>{children}</AttachmentContextProvider>;
    },
    renderEmbed(comp: EmbedComponent) {
        return <EmbedContext.Provider value={comp.props.embed}>{comp.__render()}</EmbedContext.Provider>;
    },
    renderEmbedMosaicItem(children: ReactNode, index: number) {
        return <EmbedMosaicContext.Provider value={index}>{children}</EmbedMosaicContext.Provider>;
    },
    renderAttachmentAccessory: () => <AttachmentAccessory />,
    renderEmbedAccessory: () => <EmbedAccessory />,
    filterGifs: (item: FavouriteItem) => item.format !== FavouriteItemFormat.NONE,
    fixFavItem: async (item: FullFavouriteItem | string) => {
        if (typeof item === "string") {
            SignedUrlsStore.addSigned(item);
        } else {
            SignedUrlsStore.addSigned(item.url);
            SignedUrlsStore.addSigned(item.src);

            if (typeof item.gifSrc === "function") {
                item.src = await item.gifSrc();
                delete item.gifSrc;
            }
        }
    }
});
