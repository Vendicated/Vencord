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
import { findByCodeLazy, findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { Button, Clickable, Icons, Menu, Toasts, useState } from "@webpack/common";

const PMenu = findComponentByCodeLazy(/{id:\i,label:\i,icon:\i,hint:\i,renderSubmenu:\i,...\i}/);

const EmojiComponent = findComponentByCodeLazy(/\i.translateSurrogatesToInlineEmoji\(\i.name\)/);


const StatusStyles = findByPropsLazy("statusItem");

const customStatusSettings = getUserSettingLazy("status", "customStatus");
const setStatus = findByCodeLazy(/default\.track\(\i.\i.CUSTOM_STATUS_UPDATED/);

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


const ClearStatusButton = () => <Clickable className={StatusStyles.clearCustomStatusHint} onClick={() => customStatusSettings?.updateSetting(null)}><Icons.CircleXIcon size="sm" /></Clickable>;

const RenderStatusMenuItem = ({ status }: { status: DiscordStatus; }) => {

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
        <Clickable
            onClick={() => {
                delete settings.store.StatusPresets[status.text];
                Toasts.show({
                    message: "Successfully removed Status",
                    type: Toasts.Type.SUCCESS,
                    id: Toasts.genId()
                });
            }}>{status.emojiInfo != null ? <EmojiComponent emoji={status.emojiInfo} animate={false} hideTooltip={false} /> : <div className={StatusStyles.customEmojiPlaceholder} />}</Clickable>
        <div className={StatusStyles.status} style={{ marginLeft: "5px" }}>{status.text}</div>
    </div >;
};


const StatusSubMenuComponent = () => {
    return <Menu.Menu navId="sp-custom-status-submenu" onClose={() => { }}>
        {Object.values((settings.store.StatusPresets as { [k: string]: DiscordStatus; })).map(status => <Menu.MenuItem
            id={"status-presets-" + status.text}
            label={status.status}
            action={() => setStatus(status.text, status.emojiInfo, status.clearAfter, { "location": { "section": "Account Panel", "object": "Avatar" } })}
            render={() => <RenderStatusMenuItem status={status} />}
        />)}
    </Menu.Menu>;
};


export default definePlugin({
    name: "StatusPresets",
    description: "Allows you to remember your status and set it later.",
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
            find: ".Messages.STATUS_MENU_LABEL",
            replacement: {
                match: /!\i&&(.{0,15}\i\.Fragment.+null==(\i).+customEmojiPlaceholder\}\),onClick:([^}]+}))/,
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
