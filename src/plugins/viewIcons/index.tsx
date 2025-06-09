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

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { ImageIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import { openImageModal } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { GuildMemberStore, IconUtils, Menu } from "@webpack/common";
import type { Channel, Guild, User } from "discord-types/general";


interface UserContextProps {
    channel: Channel;
    guildId?: string;
    user: User;
}

interface GuildContextProps {
    guild?: Guild;
}

interface GroupDMContextProps {
    channel: Channel;
}

const settings = definePluginSettings({
    format: {
        type: OptionType.SELECT,
        description: "Choose the image format to use for non animated images. Animated images will always use .gif",
        options: [
            {
                label: "webp",
                value: "webp",
                default: true
            },
            {
                label: "png",
                value: "png",
            },
            {
                label: "jpg",
                value: "jpg",
            }
        ]
    },
    imgSize: {
        type: OptionType.SELECT,
        description: "The image size to use",
        options: ["128", "256", "512", "1024", "2048", "4096"].map(n => ({ label: n, value: n, default: n === "1024" }))
    }
});

const openAvatar = (url: string) => openImage(url, 512, 512);
const openBanner = (url: string) => openImage(url, 1024);

function openImage(url: string, width: number, height?: number) {
    const format = url.startsWith("/") ? "png" : settings.store.format;

    const u = new URL(url, window.location.href);
    u.searchParams.set("size", settings.store.imgSize);
    u.pathname = u.pathname.replace(/\.(png|jpe?g|webp)$/, `.${format}`);
    url = u.toString();

    u.searchParams.set("size", "4096");
    const original = u.toString();

    openImageModal({
        url,
        original,
        width,
        height
    });
}

const UserContext: NavContextMenuPatchCallback = (children, { user, guildId }: UserContextProps) => {
    if (!user) return;
    const memberAvatar = GuildMemberStore.getMember(guildId!, user.id)?.avatar || null;

    children.splice(-1, 0, (
        <Menu.MenuGroup>
            <Menu.MenuItem
                id="view-avatar"
                label="View Avatar"
                action={() => openAvatar(IconUtils.getUserAvatarURL(user, true))}
                icon={ImageIcon}
            />
            {memberAvatar && (
                <Menu.MenuItem
                    id="view-server-avatar"
                    label="View Server Avatar"
                    action={() => openAvatar(IconUtils.getGuildMemberAvatarURLSimple({
                        userId: user.id,
                        avatar: memberAvatar,
                        guildId: guildId!,
                        canAnimate: true
                    }))}
                    icon={ImageIcon}
                />
            )}
        </Menu.MenuGroup>
    ));
};

const GuildContext: NavContextMenuPatchCallback = (children, { guild }: GuildContextProps) => {
    if (!guild) return;

    const { id, icon, banner } = guild;
    if (!banner && !icon) return;

    children.splice(-1, 0, (
        <Menu.MenuGroup>
            {icon ? (
                <Menu.MenuItem
                    id="view-icon"
                    label="View Icon"
                    action={() =>
                        openAvatar(IconUtils.getGuildIconURL({
                            id,
                            icon,
                            canAnimate: true
                        })!)
                    }
                    icon={ImageIcon}
                />
            ) : null}
            {banner ? (
                <Menu.MenuItem
                    id="view-banner"
                    label="View Banner"
                    action={() =>
                        openBanner(IconUtils.getGuildBannerURL(guild, true)!)
                    }
                    icon={ImageIcon}
                />
            ) : null}
        </Menu.MenuGroup>
    ));
};

const GroupDMContext: NavContextMenuPatchCallback = (children, { channel }: GroupDMContextProps) => {
    if (!channel) return;

    children.splice(-1, 0, (
        <Menu.MenuGroup>
            <Menu.MenuItem
                id="view-group-channel-icon"
                label="View Icon"
                action={() =>
                    openAvatar(IconUtils.getChannelIconURL(channel)!)
                }
                icon={ImageIcon}
            />
        </Menu.MenuGroup>
    ));
};

export default definePlugin({
    name: "ViewIcons",
    authors: [Devs.Ven, Devs.TheKodeToad, Devs.Nuckyz, Devs.nyx],
    description: "Makes avatars and banners in user profiles clickable, adds View Icon/Banner entries in the user, server and group channel context menu.",
    tags: ["ImageUtilities"],
    dependencies: ["DynamicImageModalAPI"],

    settings,

    openAvatar,
    openBanner,

    contextMenus: {
        "user-context": UserContext,
        "guild-context": GuildContext,
        "gdm-context": GroupDMContext
    },

    patches: [
        // Avatar component used in User DMs "User Profile" popup in the right and User Profile Modal pfp
        {
            find: ".overlay:void 0,status:",
            replacement: [
                {
                    // FIXME(Bundler spread transform related): Remove old compatiblity once enough time has passed, if they don't revert
                    match: /avatarSrc:(\i),eventHandlers:(\i).+?"div",{...\2,/,
                    replace: "$&style:{cursor:\"pointer\"},onClick:()=>{$self.openAvatar($1)},",
                    noWarn: true
                },
                {
                    match: /avatarSrc:(\i),eventHandlers:(\i).+?"div",.{0,100}className:\i,/,
                    replace: "$&style:{cursor:\"pointer\"},onClick:()=>{$self.openAvatar($1)},",
                }
            ],
            all: true
        },
        // Banners
        {
            find: 'backgroundColor:"COMPLETE"',
            replacement: {
                match: /(\.banner,.+?),style:{(?=.+?backgroundImage:null!=(\i)\?"url\("\.concat\(\2,)/,
                replace: (_, rest, bannerSrc) => `${rest},onClick:()=>${bannerSrc}!=null&&$self.openBanner(${bannerSrc}),style:{cursor:${bannerSrc}!=null?"pointer":void 0,`
            }
        },
        // Group DMs top small & large icon
        {
            find: '["aria-hidden"],"aria-label":',
            replacement: {
                match: /null==\i\.icon\?.+?src:(\(0,\i\.\i\).+?\))(?=[,}])/,
                // We have to check that icon is not an unread GDM in the server bar
                replace: (m, iconUrl) => `${m},onClick:()=>arguments[0]?.size!=="SIZE_48"&&$self.openAvatar(${iconUrl})`
            }
        },
        // User DMs top small icon
        {
            find: ".cursorPointer:null,children",
            replacement: {
                match: /(?=,src:(\i.getAvatarURL\(.+?[)]))/,
                replace: (_, avatarUrl) => `,onClick:()=>$self.openAvatar(${avatarUrl})`
            }
        },
        // User Dms top large icon
        {
            find: 'experimentLocation:"empty_messages"',
            replacement: {
                match: /(?<=SIZE_80,)(?=src:(.+?\))[,}])/,
                replace: (_, avatarUrl) => `onClick:()=>$self.openAvatar(${avatarUrl}),`
            }
        }
    ]
});
