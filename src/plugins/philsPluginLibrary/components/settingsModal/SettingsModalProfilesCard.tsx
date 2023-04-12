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

import { Flex } from "@components/Flex";
import { Select, TextInput, useEffect, useState } from "@webpack/common";

import { PluginSettings, ProfilableStore } from "../../../philsPluginLibrary";
import { CopyButton, DeleteButton, NewButton, SaveButton } from "../buttons";
import { SettingsModalCard } from "./SettingsModalCard";
import { SettingsModalCardItem } from "./SettingsModalCardItem";

export interface SettingsModalProfilesCardProps<T extends PluginSettings = {}> extends React.ComponentProps<typeof SettingsModalCard> {
    profileableStore: ProfilableStore<T, any>;
    onSaveStateChanged: (isSaving: boolean) => void;
}

export const SettingsModalProfilesCard = <T extends PluginSettings = {},>(props: SettingsModalProfilesCardProps<T>) => {
    const { profileableStore: { use } } = props;

    const {
        currentProfile,
        setCurrentProfile,
        deleteProfile,
        getCurrentProfile,
        getDefaultProfiles,
        getProfile,
        getProfiles,
        saveProfile,
        isCurrentProfileADefaultProfile
    } = use();

    const { name } = currentProfile;

    const [isSaving, setIsSaving] = useState(false);
    const [profileNameInput, setProfileNameInput] = useState<string>("");

    useEffect(() => {
        props.onSaveStateChanged(isSaving);
    }, [isSaving]);

    const onSaveProfile = () => {
        if (!isSaving) {
            setIsSaving(true);

        } else {
            if (profileNameInput.length && !getDefaultProfiles().some(value => value.name === profileNameInput)) {
                saveProfile({ ...getCurrentProfile(), name: profileNameInput });
                setCurrentProfile(getProfile(profileNameInput) || { name: "" });
                setIsSaving(false);
            }
        }
    };

    const onCopyProfile = () => {
        setCurrentProfile({ ...getCurrentProfile(), name: "" });
    };

    const onNewProfile = () => {
        setCurrentProfile({ name: "" });
    };

    const onDeleteProfile = () => {
        deleteProfile(currentProfile);
    };

    return (
        <SettingsModalCard
            title="Profile"
            {...props}>
            <SettingsModalCardItem>
                <Flex style={{ alignItems: "center" }}>
                    <div style={{ flex: 1 }}>
                        {isSaving
                            ? <TextInput
                                style={{ width: "100%" }}
                                placeholder="Insert name"
                                value={profileNameInput}
                                onChange={setProfileNameInput} />
                            : <Select
                                isSelected={value => name === value}
                                options={getProfiles(true).map(profile => ({
                                    label: profile.name,
                                    value: profile.name
                                }))}
                                select={value => setCurrentProfile(getProfile(value) || { name: "" })}
                                serialize={() => ""} />}
                    </div>
                    <Flex style={{ gap: "0.8em" }}>
                        <SaveButton onClick={onSaveProfile} />
                        <NewButton onClick={onNewProfile} disabled={isSaving} />
                        <CopyButton onClick={onCopyProfile} disabled={isSaving} />
                        <DeleteButton onClick={onDeleteProfile} disabled={isSaving || isCurrentProfileADefaultProfile() || !currentProfile.name.length} />
                    </Flex>
                </Flex>
            </SettingsModalCardItem>
        </SettingsModalCard>
    );
};
