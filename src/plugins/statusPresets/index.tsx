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

import { definePluginSettings } from "@api/Settings";
import { getUserSettingLazy } from "@api/UserSettings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType, StartAt } from "@utils/types";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { Button, Clickable, Icons, Menu, Toasts, useState } from "@webpack/common";

// const { PMenu } = mapMangledModuleLazy("{id:t,label:n,icon:c,hint:_,renderSubmenu:E,...h}", {
//    PMenu: filters.byCode("{id:t,label:n,icon:c,hint:_,renderSubmenu:E,...h}")
// });

const PMenu = findComponentByCodeLazy("{id:t,label:n,icon:c,hint:_,renderSubmenu:h,...E}");
const EmojiComponent = findComponentByCodeLazy("let{emoji:t,className:n,animate:r=!0,hideTooltip:a,tooltipDelay:o}");
const PSubMenu = findComponentByCodeLazy("submenuPaddingContainer,children:(0,i.jsx)(o.Menu,{contextMenuApiArguments:");
//
// submenuPaddingContainer,children:(

const Components = findByPropsLazy("Status");
const StatusStyles = findByPropsLazy("statusItem");

const statusSettings = getUserSettingLazy("status", "status");
const customStatusSettings = getUserSettingLazy("status", "customStatus");


interface Emoji {
    animated: boolean;
    id: bigint | null;
    name: string;
}

interface DiscordStatus {
    emojiInfo: Emoji | null;
    text: string;
    clearAfter: string | number | null;
    status: "online" | "dnd" | "idle" | "invisible";
}

const settings = definePluginSettings({
    StatusPresets: {
        type: OptionType.COMPONENT,
        description: "Status Presets",
        component: () => <></>,
        default: {}
    }
});


function SetStatus(status: DiscordStatus, sourceAnalyticsContext: any) {
    return Vencord.Webpack.wreq(720449).Z(status.text, status.emojiInfo, status.clearAfter, sourceAnalyticsContext);
}


const RenderStatusMenuItem = ({ status }) => {

    const [isHovering, setIsHovering] = useState(false);
    const handleMouseOver = () => {
        setIsHovering(true);
    };

    const handleMouseOut = () => {
        setIsHovering(false);
    };

    return <div className={StatusStyles.statusItem}
        onMouseOver={handleMouseOver}
        onMouseOut={handleMouseOut}>
        {isHovering ? <Clickable
            onClick={() => {
                delete settings.store.StatusPresets[status.text];
                Toasts.show({
                    message: "Successfully removed Status",
                    type: Toasts.Type.SUCCESS,
                    id: Toasts.genId()
                });
            }}><Components.Status
                status={"dnd"} className={StatusStyles.icon}
                size={12}
                style={{
                    rotate: "60deg",
                }}
            /></Clickable> : <Components.Status
            status={status.status} className={StatusStyles.icon}
            size={10}
        />}
        <div className={StatusStyles.status}>{status.status}</div>
        <div className={StatusStyles.description}>{status.text}</div>
    </div>;
};

const StatusSubMenuComponent = () => {
    return <Menu.Menu navId="sp-custom-status-submenu" onClose={() => { }}>
        {Object.values((settings.store.StatusPresets as { [k: string]: DiscordStatus; })).map(status => <Menu.MenuItem
            id={"status-presets-" + status.text}
            label={status.status}
            action={() => SetStatus(status, { "location": { "section": "Account Panel", "object": "Avatar" } })}
            render={() => <RenderStatusMenuItem status={status} />}
        />)}
    </Menu.Menu>;
};


export default definePlugin({
    name: "StatusPresets_",
    description: "do now and think later",
    authors: [Devs.Dolfies],
    settings: settings,
    dependencies: ["UserSettingsAPI"],
    patches: [
        {
            find: ".Messages.CUSTOM_STATUS_CLEAR_AFTER",
            replacement: {
                match: /\.ModalFooter,.+\.Messages\.SAVE\}\)/,
                replace: "$&,$self.renderRememberButton(this.state)"
            }
        },
        {
            find: "!eS&&(0,i.",
            replacement: {
                match: /!eS&&(\(0,i.jsxs\)\(i\.Fragment,{children)/,
                replace: "$self.render(eI, eC, W, w.Ok),true&&$1"
            }
        }
    ],
    render(status, openStatusModal: () => void, OnClose: () => void) {
        if (!customStatusSettings) return;
        const openModal = () => { OnClose(); openStatusModal(); };
        return <ErrorBoundary>
            <div className={StatusStyles.menuDivider} />
            {status == null ? <PMenu
                id="sp-custom/presets-status"
                action="PRESS_SET_STATUS"
                onClick={openModal}
                icon={() => <div className={StatusStyles.customEmojiPlaceholder} />}
                label="Set Custom Status" renderSubmenu={StatusSubMenuComponent} /> : <PMenu
                id="sp-edit/presets-status"
                action="PRESS_EDIT_CUSTOM_STATUS"
                onClick={openModal}
                hint={<Clickable tabIndex={-1} className={StatusStyles.clearCustomStatusHint} onClick={() => customStatusSettings.updateSetting(null)}><Icons.CircleXIcon size="sm" /></Clickable>}
                icon={() => status.emoji != null ? <EmojiComponent emoji={status.emoji} animate={false} hideTooltip={false} /> : null}
                label="Edit Custom Status" renderSubmenu={StatusSubMenuComponent} />}
        </ErrorBoundary>;
    },
    renderRememberButton(statue: DiscordStatus) {
        return <Button onClick={() => {
            settings.store.StatusPresets[statue.text] = statue;
            Toasts.show({
                message: "Successfully Saved Status",
                type: Toasts.Type.SUCCESS,
                id: Toasts.genId()
            });
        }} style={{ marginRight: "20px" }}>Remember</Button>;
    },
    startAt: StartAt.WebpackReady
});
