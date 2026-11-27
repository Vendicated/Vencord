/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./settings.css";

import { isPluginEnabled } from "@api/PluginManager";
import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { Divider } from "@components/Divider";
import { Flex } from "@components/Flex";
import { Heading } from "@components/Heading";
import { PlusIcon } from "@components/Icons";
import { Paragraph } from "@components/Paragraph";
import { resolveError } from "@components/settings/tabs/plugins/components/Common";
import { debounce } from "@shared/debounce";
import { classNameFactory } from "@utils/css";
import { confirmAction } from "@utils/discord";
import { ActivityType } from "@vencord/discord-types/enums";
import { Select, TextInput, useState } from "@webpack/common";

import CustomRPCPlugin, { ActivityConfig, ActivityPreview, RpcProfile, selectedProfile, selectProfile, setRpc, settings, TimestampMode } from ".";

const cl = classNameFactory("vc-customRPC-settings-");

type SettingsKey = keyof ActivityConfig;

interface TextOption<T> {
    settingsKey: SettingsKey;
    label: string;
    disabled?: boolean;
    transform?: (value: string) => T;
    isValid?: (value: T) => true | string;
}

interface SelectOption<T> {
    settingsKey: SettingsKey;
    label: string;
    disabled?: boolean;
    options: { label: string; value: T; default?: boolean; }[];
}

const makeValidator = (maxLength: number, isRequired = false) => (value: string) => {
    if (isRequired && !value) return "This field is required.";
    if (value.length > maxLength) return `Must be not longer than ${maxLength} characters.`;
    return true;
};

const maxLength128 = makeValidator(128);

function isAppIdValid(value: string) {
    if (value && !/^\d{16,21}$/.test(value)) {
        return "Must be a valid Discord ID.";
    }
    return true;
}

const updateRPC = debounce(() => {
    if (isPluginEnabled(CustomRPCPlugin.name)) {
        setRpc();
    }
});

function editProfile(changes: Partial<RpcProfile>) {
    const selected = selectedProfile()!;
    settings.store.profiles = settings.plain.profiles!.map(profile =>
        profile.id === selected.id ? { ...profile, ...changes } : profile
    );
    updateRPC();
}

function isStreamLinkValid(value: string) {
    if (!/https?:\/\/(www\.)?(twitch\.tv|youtube\.com)\/\w+/.test(value)) return "Streaming link must be a valid URL.";
    if (value && value.length > 512) return "Streaming link must be not longer than 512 characters.";
    return true;
}

function parseNumber(value: string) {
    return value ? parseInt(value, 10) : 0;
}

function isNumberValid(value: number) {
    if (isNaN(value)) return "Must be a number.";
    if (value < 0) return "Must be a positive number.";
    return true;
}

function isUrlValid(value: string) {
    if (value && !/^https?:\/\/.+/.test(value)) return "Must be a valid URL.";
    return true;
}

function isImageKeyValid(value: string) {
    if (/https?:\/\/(cdn|media)\.discordapp\.(com|net)\//.test(value)) return "Don't use a Discord link. Use an Imgur image link instead.";
    if (/https?:\/\/(?!i\.)?imgur\.com\//.test(value)) return "Imgur link must be a direct link to the image (e.g. https://i.imgur.com/...). Right click the image and click 'Copy image address'";
    if (/https?:\/\/(?!media\.)?tenor\.com\//.test(value)) return "Tenor link must be a direct link to the image (e.g. https://media.tenor.com/...). Right click the GIF and click 'Copy image address'";
    return true;
}

function PairSetting<T>(props: { data: [TextOption<T>, TextOption<T>]; }) {
    const [left, right] = props.data;

    return (
        <div className={cl("pair")}>
            <SingleSetting {...left} />
            <SingleSetting {...right} />
        </div>
    );
}

function SingleSetting<T>({ settingsKey, label, disabled, isValid, transform }: TextOption<T>) {
    const [state, setState] = useState(selectedProfile()![settingsKey] ?? "");
    const [error, setError] = useState<string | null>(null);

    function handleChange(newValue: any) {
        if (transform) newValue = transform(newValue);

        const valid = isValid?.(newValue) ?? true;

        setState(newValue);
        setError(resolveError(valid));

        if (valid === true) {
            editProfile({ [settingsKey]: newValue });
        }
    }

    return (
        <div className={cl("single", { disabled })}>
            <Heading>{label}</Heading>
            <TextInput
                type="text"
                placeholder={"Enter a value"}
                value={state}
                onChange={handleChange}
                disabled={disabled}
            />
            {error && <Paragraph className={cl("error")}>{error}</Paragraph>}
        </div>
    );
}

function SelectSetting<T>({ settingsKey, label, options, disabled }: SelectOption<T>) {
    return (
        <div className={cl("single", { disabled })}>
            <Heading>{label}</Heading>
            <Select
                placeholder={"Select an option"}
                options={options}
                maxVisibleItems={5}
                closeOnSelect={true}
                select={v => {
                    editProfile({ [settingsKey]: v });
                }}
                isSelected={v => v === selectedProfile()![settingsKey]}
                serialize={v => String(v)}
                isDisabled={disabled}
            />
        </div>
    );
}

export function RPCSettings() {
    const { profiles = [] } = settings.use(["profiles", "selectedProfileId"]);
    const profile = selectedProfile();

    function addProfile() {
        const id = crypto.randomUUID();
        const newProfile = { id, label: "New profile" };
        settings.store.profiles = [...(settings.plain.profiles ?? []), newProfile];
        selectProfile(id);
    }

    function deleteProfile(target: RpcProfile) {
        confirmAction({
            title: "Delete profile",
            subtitle: `Delete "${target.label}"?`,
            confirmText: "Delete",
            onConfirm() {
                settings.store.profiles = settings.plain.profiles!.filter(p => p.id !== target.id);
                selectProfile(selectedProfile()?.id);
            }
        });
    }

    return (
        <div className={cl("root")}>
            <Heading>Profile</Heading>
            <Select
                placeholder="Select a profile"
                options={[
                    ...profiles.map(p => ({ label: p.label || "Unnamed profile", value: p.id })),
                    { label: "Add profile", value: "add" }
                ]}
                renderOptionLabel={({ label, value }) => value === "add"
                    ? <Flex alignItems="center" gap=".5em"><PlusIcon width={16} height={16} />{label}</Flex>
                    : label
                }
                select={id => {
                    if (id === "add") {
                        addProfile();
                    } else {
                        selectProfile(id);
                    }
                }}
                isSelected={id => id === profile?.id}
                serialize={id => id}
                closeOnSelect
            />
            {profile && (
                <Card key={profile.id} className={cl("root")} defaultPadding>
                    <Heading>Profile name</Heading>
                    <TextInput value={profile.label} onChange={label => editProfile({ label })} />

                    <ActivityPreview profile={profile} />
                    <ActivityEditor profile={profile} />

                    <Button variant="dangerSecondary" onClick={() => deleteProfile(profile)}>
                        Delete profile
                    </Button>
                </Card>
            )}
        </div>
    );
}

function ActivityEditor({ profile: s }: { profile: RpcProfile; }) {
    return (
        <div className={cl("root")}>
            <SelectSetting
                settingsKey="type"
                label="Activity Type"
                options={[
                    {
                        label: "Playing",
                        value: ActivityType.PLAYING,
                        default: true
                    },
                    {
                        label: "Streaming",
                        value: ActivityType.STREAMING
                    },
                    {
                        label: "Listening",
                        value: ActivityType.LISTENING
                    },
                    {
                        label: "Watching",
                        value: ActivityType.WATCHING
                    },
                    {
                        label: "Competing",
                        value: ActivityType.COMPETING
                    }
                ]}
            />

            <PairSetting data={[
                { settingsKey: "appID", label: "Application ID (optional)", isValid: isAppIdValid },
                { settingsKey: "appName", label: "Application Name", isValid: makeValidator(128, true) },
            ]} />

            <PairSetting data={[
                { settingsKey: "details", label: "Detail (line 1)", isValid: maxLength128 },
                { settingsKey: "detailsURL", label: "Detail URL", isValid: isUrlValid },
            ]} />

            <PairSetting data={[
                { settingsKey: "state", label: "State (line 2)", isValid: maxLength128 },
                { settingsKey: "stateURL", label: "State URL", isValid: isUrlValid },
            ]} />

            <SingleSetting
                settingsKey="streamLink"
                label="Stream Link (Twitch or YouTube, only if activity type is Streaming)"
                disabled={s.type !== ActivityType.STREAMING}
                isValid={isStreamLinkValid}
            />

            <PairSetting data={[
                {
                    settingsKey: "partySize",
                    label: "Party Size",
                    transform: parseNumber,
                    isValid: isNumberValid,
                    disabled: s.type !== ActivityType.PLAYING,
                },
                {
                    settingsKey: "partyMaxSize",
                    label: "Maximum Party Size",
                    transform: parseNumber,
                    isValid: isNumberValid,
                    disabled: s.type !== ActivityType.PLAYING,
                },
            ]} />

            <Divider />

            <PairSetting data={[
                { settingsKey: "imageBig", label: "Large Image URL/Key", isValid: isImageKeyValid },
                { settingsKey: "imageBigTooltip", label: "Large Image Text", isValid: maxLength128 },
            ]} />
            <SingleSetting settingsKey="imageBigURL" label="Large Image clickable URL" isValid={isUrlValid} />

            <PairSetting data={[
                { settingsKey: "imageSmall", label: "Small Image URL/Key", isValid: isImageKeyValid },
                { settingsKey: "imageSmallTooltip", label: "Small Image Text", isValid: maxLength128 },
            ]} />
            <SingleSetting settingsKey="imageSmallURL" label="Small Image clickable URL" isValid={isUrlValid} />

            <Divider />

            <PairSetting data={[
                { settingsKey: "buttonOneText", label: "Button1 Text", isValid: makeValidator(31) },
                { settingsKey: "buttonOneURL", label: "Button1 URL", isValid: isUrlValid },
            ]} />
            <PairSetting data={[
                { settingsKey: "buttonTwoText", label: "Button2 Text", isValid: makeValidator(31) },
                { settingsKey: "buttonTwoURL", label: "Button2 URL", isValid: isUrlValid },
            ]} />

            <Divider />

            <SelectSetting
                settingsKey="timestampMode"
                label="Timestamp Mode"
                options={[
                    {
                        label: "None",
                        value: TimestampMode.NONE,
                        default: true
                    },
                    {
                        label: "Since discord open",
                        value: TimestampMode.NOW
                    },
                    {
                        label: "Same as your current time (not reset after 24h)",
                        value: TimestampMode.TIME
                    },
                    {
                        label: "Custom",
                        value: TimestampMode.CUSTOM
                    }
                ]}
            />

            <PairSetting data={[
                {
                    settingsKey: "startTime",
                    label: "Start Timestamp (in milliseconds)",
                    transform: parseNumber,
                    isValid: isNumberValid,
                    disabled: s.timestampMode !== TimestampMode.CUSTOM,
                },
                {
                    settingsKey: "endTime",
                    label: "End Timestamp (in milliseconds)",
                    transform: parseNumber,
                    isValid: isNumberValid,
                    disabled: s.timestampMode !== TimestampMode.CUSTOM,
                },
            ]} />
        </div>
    );
}
