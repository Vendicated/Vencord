import { User } from "discord-types/general";

import { useSettings } from "../../api/settings";
import { lazyWebpack } from "../../utils";
import { ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize } from "../../utils/modal";
import { Plugin, PluginSettingsItem } from "../../utils/types";
import { filters } from "../../webpack";
import { Button, Forms, React, Text, Tooltip } from "../../webpack/common";
import { Flex } from "../Flex";

const { FormSection, FormText, FormTitle } = Forms;

const getUser = lazyWebpack(filters.byCode(".USER(", "getUser"));
const UserSummaryItem = lazyWebpack(filters.byCode("defaultRenderUser", "showDefaultAvatarsForNullUsers"));
const Select = lazyWebpack(filters.byCode("optionClassName", "popoutPosition", "autoFocus", "maxVisibleItems"));
const TextInput = lazyWebpack(filters.byCode("defaultDirty", "getIsUnderFlowing", "getIsOverFlowing"));
const AvatarStyles = lazyWebpack(filters.byProps(["moreUsers", "emptyUser", "avatarContainer", "clickableAvatar"]));

interface PluginModalProps extends ModalProps {
    plugin: Plugin;
    onRestartNeeded(): void;
}

export default function PluginModal(props: PluginModalProps) {
    const { plugin, onRestartNeeded, onClose } = props;

    const [authors, setAuthors] = React.useState<Partial<User>[]>([]);

    const pluginSettings = useSettings().plugins[plugin.name];

    const [tempSettings, setTempSettings] = React.useState<Record<string, any>>({});

    React.useEffect(() => {
        (async () => {
            for (const user of plugin.authors.slice(0, 6)) {
                const author = await getUser(user.id);
                setAuthors(a => [...a, author]);
            }
        })();
    }, []);

    function saveAndClose() {
        if (!plugin.settings) {
            onClose();
            return;
        }
        for (const [key, value] of Object.entries(tempSettings)) {
            const setting = plugin.settings.find(s => s.key === key);
            pluginSettings[key] = value;
            setting?.onChange?.(value);
            if (setting?.restartNeeded) onRestartNeeded();
        }
        onClose();
    }

    function renderSettings() {
        if (!pluginSettings || !plugin.settings) {
            return <FormText>There are no settings for this plugin.</FormText>;
        }

        let options: JSX.Element[] = [];
        for (const setting of plugin.settings) {
            function onChange(newValue) {
                setTempSettings(s => ({ ...s, [setting.key]: newValue }));
            }

            switch (setting.type) {
                case "select": {
                    options.push(<SettingSelectElement key={setting.key} setting={setting} onChange={onChange} pluginSettings={pluginSettings} />);
                    break;
                }
                case "string": {
                    options.push(<SettingInputElement key={setting.key} setting={setting} onChange={onChange} pluginSettings={pluginSettings} />);
                    break;
                }
                case "number": {
                    options.push(<SettingNumericElement key={setting.key} setting={setting} onChange={onChange} pluginSettings={pluginSettings} />);
                    break;
                }
                case "boolean": {
                    options.push(<SettingBooleanElement key={setting.key} setting={setting} onChange={onChange} pluginSettings={pluginSettings} />);
                }
            }
        }
        return <Flex flexDirection="column" style={{ gap: 12 }}>{options}</Flex>;
    }

    function renderMoreUsers(label: string, count: number) {
        const sliceCount = plugin.authors.length - count;
        const sliceStart = plugin.authors.length - sliceCount;
        const sliceEnd = sliceStart + plugin.authors.length - count;

        return (
            <Tooltip text={plugin.authors.slice(sliceStart, sliceEnd).map(u => u.name).join(", ")}>
                {({ onMouseEnter, onMouseLeave }) => (
                    <div
                        className={AvatarStyles.moreUsers}
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                    >
                        +{sliceCount}
                    </div>
                )}
            </Tooltip>
        );
    }

    return (
        <ModalRoot transitionState={props.transitionState} size={ModalSize.MEDIUM}>
            <ModalHeader>
                <Text variant="heading-md/bold">{plugin.name}</Text>
            </ModalHeader>
            <ModalContent style={{ marginBottom: 8, marginTop: 8 }}>
                <FormSection>
                    <FormTitle tag="h3">About {plugin.name}</FormTitle>
                    <FormText>{plugin.description}</FormText>
                    <div style={{ marginTop: 8, marginBottom: 8, width: "fit-content" }}>
                        <UserSummaryItem
                            users={authors}
                            count={plugin.authors.length}
                            guildId={undefined}
                            renderIcon={false}
                            max={6}
                            showDefaultAvatarsForNullUsers
                            showUserPopout
                            renderMoreUsers={renderMoreUsers}
                        />
                    </div>
                </FormSection>
                {plugin.aboutComponent && (
                    <div style={{ marginBottom: 8 }}>
                        <FormSection>
                            {plugin.aboutComponent()}
                        </FormSection>
                    </div>
                )}
                <FormSection>
                    <FormTitle tag="h3">Settings</FormTitle>
                    {renderSettings()}
                </FormSection>
            </ModalContent>
            <ModalFooter>
                <Flex>
                    <Button
                        onClick={props.onClose}
                        size={Button.Sizes.SMALL}
                        color={Button.Colors.RED}
                    >
                        Exit Without Saving
                    </Button>
                    <Button
                        size={Button.Sizes.SMALL}
                        color={Button.Colors.BRAND}
                        onClick={saveAndClose}
                    >
                        Save & Exit
                    </Button>
                </Flex>
            </ModalFooter>
        </ModalRoot>
    );
}

interface ISettingElementProps {
    setting: PluginSettingsItem;
    onChange(newValue: any): void;
    pluginSettings: {
        [setting: string]: any;
        enabled: boolean;
    };
}

function SettingSelectElement(props: ISettingElementProps) {
    const { setting, pluginSettings } = props;
    const def = pluginSettings[setting.key] ?? setting.options?.find(o => o.default)?.value;
    const [state, setState] = React.useState<any>(def ?? null);

    function onChange(newValue) {
        setState(newValue);
        props.onChange(newValue);
    }

    return (
        <FormSection>
            <FormTitle>{setting.name}</FormTitle>
            <Select
                isDisabled={setting.disabled?.() ?? false}
                options={setting.options}
                placeholder={setting.placeholder ?? "Select an option"}
                maxVisibleItems={5}
                closeOnSelect={true}
                select={onChange}
                isSelected={v => v === state}
                serialize={v => String(v)}
                {...setting.componentProps}
            />
        </FormSection>
    );
}

function SettingInputElement(props: ISettingElementProps) {
    const { setting, pluginSettings } = props;
    const [state, setState] = React.useState<any>(pluginSettings[setting.key] ?? setting.default ?? null);

    function onChange(newValue) {
        setState(newValue);
        props.onChange(newValue);
    }

    return (
        <FormSection>
            <FormTitle>{setting.name}</FormTitle>
            <TextInput
                type="text"
                value={state}
                onChange={onChange}
                placeholder={setting.placeholder ?? "Enter a value"}
                disabled={setting.disabled?.() ?? false}
                {...setting.componentProps}
            />
        </FormSection>
    );
}

function SettingNumericElement(props: ISettingElementProps) {
    const { setting, pluginSettings } = props;
    const [state, setState] = React.useState<any>(pluginSettings[setting.key] ?? BigInt(setting.default ?? 0));

    function onChange(newValue) {
        setState(newValue);
        props.onChange(BigInt(newValue));
    }

    return (
        <FormSection>
            <FormTitle>{setting.name}</FormTitle>
            <TextInput
                type="number"
                pattern="[0-9]+"
                value={state}
                onChange={onChange}
                placeholder={setting.placeholder ?? "Enter a number"}
                disabled={setting.disabled?.() ?? false}
                {...setting.componentProps}
            />
        </FormSection>
    );
}

function SettingBooleanElement(props: ISettingElementProps) {
    const { setting, pluginSettings } = props;
    const def = pluginSettings[setting.key] ?? setting.options?.find(o => o.default)?.value;
    const [state, setState] = React.useState<any>(def ?? false);

    const options = [
        { label: "Enabled", value: true, default: def === true },
        { label: "Disabled", value: false, default: typeof def === "undefined" || def === false },
    ];

    function onChange(newValue) {
        setState(newValue);
        props.onChange(newValue);
    }

    return (
        <FormSection>
            <FormTitle>{setting.name}</FormTitle>
            <Select
                isDisabled={setting.disabled?.() ?? false}
                options={options}
                placeholder={setting.placeholder ?? "Select an option"}
                maxVisibleItems={5}
                closeOnSelect={true}
                select={onChange}
                isSelected={v => v === state}
                serialize={v => String(v)}
                {...setting.componentProps}
            />
        </FormSection>
    );
}

