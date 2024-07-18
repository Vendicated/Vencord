/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import { React } from "@webpack/common";

import { SettingsPanel } from "../components";
import { IconComponent, SettingsPanelButton } from "../components/settingsPanel/SettingsPanelButton";
import { SettingsPanelRow } from "../components/settingsPanel/SettingsPanelRow";
import { SettingsPanelTooltipButton } from "../components/settingsPanel/SettingsPanelTooltipButton";

export interface PanelButton {
    name: string,
    tooltipText?: string,
    icon?: IconComponent;
    onClick?: () => void;
}

const settingsPanelButtonsSubscriptions = new Set<React.DispatchWithoutAction>();
export const settingsPanelButtons: PanelButton[] = new Proxy<PanelButton[]>([], {
    set: (target, p, newValue) => {
        target[p] = newValue;
        settingsPanelButtonsSubscriptions.forEach(fn => fn());
        return true;
    },
});

export const useButtons = () => {
    const [, forceUpdate] = React.useReducer(() => ({}), {});

    React.useEffect(() => {
        settingsPanelButtonsSubscriptions.add(forceUpdate);
        return () => void settingsPanelButtonsSubscriptions.delete(() => forceUpdate);
    }, []);

    return settingsPanelButtons;
};

export const ButtonsSettingsPanel = () => {
    const rawPanelButtons = useButtons();

    const convertRawPanelButtons = (buttons: PanelButton[]) => {
        const settingsPanelButtonsClone = [...buttons].sort();
        const groupedButtons: JSX.Element[][] = [];

        while (settingsPanelButtonsClone.length) {
            const splicedButtons =
                settingsPanelButtonsClone
                    .splice(0, 3)
                    .map(({ icon, tooltipText, onClick }) =>
                        tooltipText
                            ? <SettingsPanelTooltipButton tooltipProps={{ text: tooltipText }} icon={icon} onClick={onClick} />
                            : <SettingsPanelButton icon={icon} onClick={onClick} />
                    );

            groupedButtons.push(splicedButtons);
        }

        return groupedButtons;
    };

    return rawPanelButtons.length > 0
        ? <SettingsPanel>
            {...convertRawPanelButtons(rawPanelButtons).map(value => <SettingsPanelRow children={value} />)}
        </SettingsPanel>
        : <>
        </>;
};

export function replacedUserPanelComponent(oldComponent: (...args: any[]) => any, thisContext: any, functionArguments: any) {
    const componentResult: JSX.Element = Reflect.apply(oldComponent, thisContext, functionArguments);

    if (!componentResult?.props) return componentResult;

    const { children } = componentResult.props;

    const userPanel = children.at(-2);
    const userPanelChildren = userPanel.props.children;

    userPanelChildren.splice(userPanelChildren.length - 1, 0,
        <ButtonsSettingsPanel />
    );

    return componentResult;
}

export function addSettingsPanelButton(settings: PanelButton) {
    settingsPanelButtons.push(settings);
}

export function removeSettingsPanelButton(name: string) {
    settingsPanelButtons.splice(0, settingsPanelButtons.length, ...settingsPanelButtons.filter(value => value.name !== name));
}
