import { Modal, openModal } from "../utils/modal";
import definePlugin from '../utils/types';
import { filters, waitFor } from "../webpack";

let ImageModal: any;
let renderMaskedLink: any;

waitFor(filters.byDisplayName("ImageModal"), m => ImageModal = m.default);
waitFor("renderMaskedLinkComponent", m => renderMaskedLink = m.renderMaskedLinkComponent);

const OPEN_URL = "Vencord.Plugins.plugins.ViewIcons.openImage(";
export default definePlugin({
    name: "ViewIcons",
    author: "Vendicated",
    description: "Makes Avatars/Banners in user profiles clickable, and adds Guild Context Menu Entries to View Banner/Icon. Crashes if you don't have Developer Mode enabled, will fix in the future.",

    openImage(url: string) {
        openModal(() => (
            <ImageModal
                shouldAnimate={true}
                original={url}
                src={url}
                renderLinkComponent={renderMaskedLink}
            />
        ), { size: Modal.ModalSize.DYNAMIC });
    },

    patches: [
        {
            find: "UserProfileModalHeader",
            replacement: {
                match: /\{src:(.{1,2}),avatarDecoration/,
                replace: (_, src) => `{src:${src},onClick:()=>${OPEN_URL}${src}.replace(/\\?.+$/, "")+"?size=2048"),avatarDecoration`
            }
        }, {
            find: "default.popoutNoBannerPremium",
            replacement: {
                match: /style:.{1,2}\(\{\},(.{1,2}),/,
                replace: (m, bannerObj) => `onClick:${bannerObj}.backgroundImage&&(()=>${OPEN_URL}${bannerObj}.backgroundImage.replace("url(", "").replace(/(\\?size=.+)?\\)/, "?size=2048"))),${m}`
            }
        }, {
            find: "GuildContextMenuWrapper",
            replacement: [
                {
                    match: /\w=(\w)\.id/,
                    replace: (m, guild) => `_guild=${guild},${m}`
                },
                {
                    match: /,(.{1,2})\((.{1,2})\.MenuGroup,\{\},void 0,(.{1,2})\)(?=\)\}.{1,2}\.displayName)/,
                    replace: (_, createElement, menu, copyIdElement) => `,${createElement}(${menu}.MenuGroup,{},void 0,[` +
                        `_guild.icon&&${createElement}(${menu}.MenuItem,` +
                        `{id:"viewicons-copy-icon",label:"View Icon",action:()=>${OPEN_URL}_guild.getIconURL(void 0,true)+"size=2048")}),` +
                        `_guild.banner&&${createElement}(${menu}.MenuItem,` +
                        `{id:"viewicons-copy-banner",label:"View Banner",action:()=>${OPEN_URL}Vencord.Webpack.findByProps("getGuildBannerURL").getGuildBannerURL(_guild).replace(/\\?size=.+/, "?size=2048"))}),${copyIdElement}])`
                }
            ]
        }
    ]
});
