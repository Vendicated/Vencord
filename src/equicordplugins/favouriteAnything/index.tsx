/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs, EquicordDevs } from "@utils/constants";
import { getIntlMessage } from "@utils/discord";
import definePlugin from "@utils/types";
import { Embed } from "@vencord/discord-types";
import { proxyLazyWebpack } from "@webpack";
import { React } from "@webpack/common";
import { ComponentType, ReactNode } from "react";

import { AttachmentAccessory, EmbedAccessory, FilePicker } from "./components";
import { SignedUrlsStore } from "./stores";
import managedStyle from "./style.css?managed";
import { AttachmentItem, EmbedComponent, ExpressionPickerTabProps, ExpressionPickerView, FavouriteItem, FavouriteItemFormat } from "./types";
import { getThumbnailUrl } from "./utils";

export const EmbedContext = proxyLazyWebpack(() => React.createContext<null | Embed>(null));
export const EmbedMosaicContext = proxyLazyWebpack(() => React.createContext<null | number>(null));
export const AttachmentContext = proxyLazyWebpack(() => React.createContext<null | AttachmentItem>(null));

export default definePlugin({
    name: "FavouriteAnything",
    description: "Favourite any image, video, or file attachment",
    authors: [Devs.nin0dev, EquicordDevs.davri],
    tags: ["favorite"],
    managedStyle,
    patches: [
        // EMBEDS
        {
            find: "this.renderInlineMediaEmbed",
            replacement: [
                {
                    // Wrap the embed component's render method in a custom context to avoid having to drill props
                    match: "render()",
                    replace: "$&{return $self.renderEmbed.call(this)}__render()"
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
                match: /renderAdjacentContent:(\i)/g,
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
                    match: "=[];",
                    replace: "=[$self.renderAttachmentAccessory()];"
                }
            ]
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
        // FAVOURITE BUTTON
        {
            find: "#{intl::GIF_TOOLTIP_REMOVE_FROM_FAVORITES}",
            replacement: {
                // Intercept the onClick callback to replace the placeholder thumbnail with a valid CDN link
                match: /\(0,(\i\.\i)\)\((\{[^}].{40,60}?\})\)/,
                replace: "$self.interceptAddToFavourites($2).then($1)"
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
                    Media
                </Tab>
                <Tab
                    id="files-picker-tab"
                    key="files-picker-tab"
                    aria-controls="files-picker-tab-panel"
                    aria-selected={activeView === ExpressionPickerView.FILES}
                    isActive={activeView === ExpressionPickerView.FILES}
                    viewType={ExpressionPickerView.FILES}
                >
                    {getIntlMessage("FILES")}
                </Tab>
            </>
        );
    },
    renderFilePicker(activeView: ExpressionPickerView, onSelectGIF: (item: { url: string; }) => void) {
        return activeView === ExpressionPickerView.FILES ? <FilePicker onSelectItem={onSelectGIF} /> : null;
    },
    renderAttachment(children: ReactNode, props: { item: AttachmentItem; }) {
        return <AttachmentContext.Provider value={props.item}>{children}</AttachmentContext.Provider>;
    },
    renderEmbed(this: EmbedComponent) {
        return <EmbedContext.Provider value={this.props.embed}>{this.__render()}</EmbedContext.Provider>;
    },
    renderEmbedMosaicItem(children: ReactNode, index: number) {
        return <EmbedMosaicContext.Provider value={index}>{children}</EmbedMosaicContext.Provider>;
    },
    renderAttachmentAccessory: () => <AttachmentAccessory />,
    renderEmbedAccessory: () => <EmbedAccessory />,
    filterGifs: (item: FavouriteItem) => item.format !== FavouriteItemFormat.NONE,
    interceptAddToFavourites: async (item: FavouriteItem & { url: string; }) => {
        if (item.format !== FavouriteItemFormat.NONE) return item;

        SignedUrlsStore.addSigned(item.url);

        if (URL.canParse(item.src)) {
            SignedUrlsStore.addSigned(item.src);
            return item;
        }

        const thumbnail = await getThumbnailUrl(item.src, item.width, item.height);
        if (!thumbnail) return item;

        thumbnail.search = "";
        thumbnail.hash = item.src;
        return { ...item, src: `${thumbnail}` };
    }
});
