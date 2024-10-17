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

import "./style.css";

import { definePluginSettings } from "@api/Settings";
import { getUserSettingLazy } from "@api/UserSettings";
import ErrorBoundary from "@components/ErrorBoundary";
import { EquicordDevs } from "@utils/constants";
import { classes } from "@utils/misc";
import { useForceUpdater } from "@utils/react";
import definePlugin, { OptionType, StartAt } from "@utils/types";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { Button, Clickable, Icons, Menu, Toasts, UserStore, useState } from "@webpack/common";

const settings = definePluginSettings({
    StatusPresets: {
        type: OptionType.COMPONENT,
        description: "Status Presets",
        component: () => <></>,
        default: {}
    }
});

interface Emoji {
    animated: boolean;
    id: bigint | null;
    name: string;
}

interface DiscordStatus {
    emojiInfo: Emoji | null;
    text: string;
    clearAfter: "TODAY" | number | null;
    status: "online" | "dnd" | "idle" | "invisible";
}

const StatusStyles = findByPropsLazy("statusItem");

const PMenu = findComponentByCodeLazy(".menuItemLabel", ".menuItemInner");
const EmojiComponent = findComponentByCodeLazy(".translateSurrogatesToInlineEmoji(");

const CustomStatusSettings = getUserSettingLazy("status", "customStatus")!;

function getExpirationMs(expiration: "TODAY" | number) {
    if (expiration !== "TODAY") return Date.now() + expiration;

    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
}

function setStatus(status: DiscordStatus) {
    CustomStatusSettings.updateSetting({
        text: status.text.trim(),
        expiresAtMs: status.clearAfter != null ? String(getExpirationMs(status.clearAfter)) : "0",
        emojiId: status.emojiInfo?.id ?? "0",
        emojiName: status.emojiInfo?.name ?? "",
        createdAtMs: String(Date.now())
    });
}

const ClearStatusButton = () => <Clickable className={StatusStyles.clearCustomStatusHint} onClick={e => { e.stopPropagation(); CustomStatusSettings?.updateSetting(null); }}><Icons.CircleXIcon size="sm" /></Clickable>;

function StatusIcon({ isHovering, status }: { isHovering: boolean; status: DiscordStatus; }) {
    return <div className={StatusStyles.status}>{isHovering ?
        <Icons.CircleXIcon size="sm" />
        : (status.emojiInfo != null ? <EmojiComponent emoji={status.emojiInfo} animate={false} hideTooltip={false} /> : <div className={StatusStyles.customEmojiPlaceholder} />)}</div>;
}

const RenderStatusMenuItem = ({ status, update, disabled }: { status: DiscordStatus; update: () => void; disabled: boolean; }) => {
    const [isHovering, setIsHovering] = useState(false);
    const handleMouseOver = () => {
        setIsHovering(true);
    };

    const handleMouseOut = () => {
        setIsHovering(false);
    };

    return <div className={classes(StatusStyles.statusItem, "vc-sp-item", disabled ? "vc-sp-disabled" : null)}
        onMouseOver={handleMouseOver}
        onMouseOut={handleMouseOut}>
        <Clickable
            onClick={e => {
                e.stopPropagation();
                settings.store.StatusPresets[status.text] = undefined; // setting to undefined to remove it.
                update();
            }}><StatusIcon isHovering={isHovering} status={status} /></Clickable>
        <div className={StatusStyles.status} style={{ marginLeft: "2px" }}>{status.text}</div>
    </div >;
};


const StatusSubMenuComponent = () => {
    const update = useForceUpdater();
    return <Menu.Menu navId="sp-custom-status-submenu" onClose={() => { }}>
        {Object.entries((settings.store.StatusPresets as { [k: string]: DiscordStatus | undefined; })).map(([index, status]) => status != null ? <Menu.MenuItem
            id={"status-presets-" + index}
            label={status.status}
            action={() => (status.emojiInfo?.id != null && UserStore.getCurrentUser().hasPremiumPerks || status.emojiInfo?.id == null) && setStatus(status)}
            render={() => <RenderStatusMenuItem
                status={status}
                update={update}
                disabled={status.emojiInfo?.id != null && !UserStore.getCurrentUser().hasPremiumPerks}
            />}
        /> : null)}
    </Menu.Menu>;
};


export default definePlugin({
    name: "StatusPresets",
    description: "Allows you to remember your statuses and set them later",
    authors: [EquicordDevs.iamme],
    settings: settings,
    dependencies: ["UserSettingsAPI"],
    patches: [
        {
            find: "Messages.CUSTOM_STATUS_SET_CUSTOM_STATUS}",
            replacement: {
                match: /\.ModalFooter,.{0,70}\.Messages\.SAVE\}\)/,
                replace: "$&,$self.renderRememberButton(this.state)"
            }
        },
        {
            find: /"aria-label":.{0,3}\.Messages.STATUS_MENU_LABEL/,
            replacement: {
                match: /!\i&&(.{0,15}\i\.Fragment.{0,55}null==(\i).{0,200}customEmojiPlaceholder\}\),onClick:([^}]+}))/,
                replace: "$self.render($2, $3),false&&$1"
            }
        }
    ],
    render(status: null | { emoji: Emoji | null; }, openCustomStatusModal: () => void) {
        return <ErrorBoundary>
            <div className={StatusStyles.menuDivider} />
            {status == null ?
                <PMenu
                    id="sp-custom/presets-status"
                    action="PRESS_SET_STATUS"
                    onClick={openCustomStatusModal}
                    icon={() => <div className={StatusStyles.customEmojiPlaceholder} />}
                    label="Set Custom Status" renderSubmenu={StatusSubMenuComponent}
                />
                :
                <PMenu
                    id="sp-edit/presets-status"
                    action="PRESS_EDIT_CUSTOM_STATUS"
                    onClick={openCustomStatusModal}
                    hint={<ClearStatusButton />}
                    icon={() => status.emoji != null ? <EmojiComponent emoji={status.emoji} animate={false} hideTooltip={false} /> : null}
                    label="Edit Custom Status" renderSubmenu={StatusSubMenuComponent}
                />}
        </ErrorBoundary>;
    },
    renderRememberButton(statue: DiscordStatus) {
        return <Button
            look={Button.Looks.LINK}
            color={Button.Colors.WHITE}
            size={Button.Sizes.MEDIUM}
            onClick={e => {
                settings.store.StatusPresets[statue.text] = statue;
                Toasts.show({
                    message: "Successfully Saved Status",
                    type: Toasts.Type.SUCCESS,
                    id: Toasts.genId()
                });
            }}
            style={{ marginRight: "20px" }}
        >Remember</Button>;
    },
    startAt: StartAt.WebpackReady
});
