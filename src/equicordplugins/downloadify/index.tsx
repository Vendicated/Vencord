/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";

import { settings } from "./settings";
import { GDMContextMenu, GuildContextMenu, handleExpandedModalDownloadButtonClicked, handleHoverDownloadButtonClicked, MessageContextMenu, UserContextMenu, VoiceMessageDownloadButton } from "./utils/handlers";

export default definePlugin({
    name: "Downloadify",
    description: "Download various assets directly in Discord without having to open a browser or dig through HTML.",
    authors: [EquicordDevs.Etorix],
    hidden: IS_WEB,
    settings,

    VoiceMessageDownloadButton,
    handleHoverDownloadButtonClicked,
    handleExpandedModalDownloadButtonClicked,

    contextMenus: {
        "message": MessageContextMenu,
        "guild-context": GuildContextMenu,
        "user-context": UserContextMenu,
        "gdm-context": GDMContextMenu
    },

    patches: [
        {
            // Pass the guild ID to the profile modal context. Used by the next patch.
            find: "clanTagChiplet}),",
            replacement: {
                match: /("right",)(avatarUrl:null)/,
                replace: "$1guildId:arguments[0]?.channel?.guild_id,$2"
            }
        },
        {
            // Pass the guild ID to the profile modal renderer. Allows guild specific profiles
            // to load on the initial click instead of having to expand the profile first.
            // Needed specifically for member banners.
            find: '["children","userId","user"]',
            replacement: {
                match: /(\),{)(user:\i,currentUser:\i,children)/,
                replace: "$1guildId:arguments[0].guildId,$2"
            }
        },
        {
            // Adds a download button to voice messages before the volume slider.
            find: "volumeSlider,muted",
            replacement: {
                match: /(}\),)(\(0,\i.\i\)\(\i.\i,{className:\i.volumeButton)/,
                replace: "$1$self.VoiceMessageDownloadButton(arguments[0]),$2"
            }
        },
        {
            // Hides the inline download button on text files in
            // favor of the hover download button enabled below.
            find: "formattedSize),children",
            replacement: {
                match: /(\(0,\i.\i\)\(\i.\i,{text:"".concat\(\i.intl.string)/,
                replace: "false&&$1"
            }
        },
        {
            // Passes on the file information to be used by the hover download buttons.
            find: "downloadUrl,showDownload",
            replacement: {
                match: /(showImageAppPicker:\i&&\i)/,
                replace: "item:arguments[0].item,$1"
            }
        },
        {
            // Forces the hover download button to always be visible on supported media.
            // Also overwrites the onClick function to use the custom download handling.
            find: "downloadHoverButtonIcon,focusProps:{",
            replacement: {
                match: /((\i)=>{)(.{0,60}?)showDownload:(\i),(.{0,1250}?)href:\i,/,
                replace: "$1const downloadifyHoverItem=$2;$3downloadifyShowDownload:$4=!0,$5onClick:()=>{$self.handleHoverDownloadButtonClicked(downloadifyHoverItem);},"
            },
        },
        {
            // Overwrites the default download button behavior for expanded image & video modals.
            // This patch is lazy loaded. You must open an image or video modal for it to resolve.
            find: "SAVE_MEDIA_PRESSED),",
            group: true,
            replacement: [
                {
                    // Make use of the download function.
                    match: /(let{item:\i}=(\i).{0,450}?)(await \i.\i.saveImage\(\i,\i.contentType,\i.\i\)),/,
                    replace: "$1await $self.handleExpandedModalDownloadButtonClicked($2,async()=>{$3});",
                },
                {
                    // Disable default success toast.
                    match: /(\(0,.{0,85}?ToastType.SUCCESS\)\))/,
                    replace: "",
                },
                {
                    // Disable default failure toast.
                    match: /(\(0,.{0,85}?ToastType.FAILURE\)\))/,
                    replace: "",
                },
                {
                    // Prevent videos from opening in browser.
                    match: /(let{item:\i}=\i.{0,350}?)(SAVE_MEDIA_PRESSED\)).{0,100}?(\i\(!0\);)/,
                    replace: "$1$2,true){$3"
                }
            ],
        }
    ]
});
