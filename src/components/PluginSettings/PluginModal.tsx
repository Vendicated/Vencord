import { User } from "discord-types/general";
import { useSettings } from "../../api/settings";
import { lazyWebpack, Modals } from "../../utils";
import { ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize } from "../../utils/modal";
import { Plugin, PluginSettingsItem } from "../../utils/types";
import { filters } from "../../webpack";
import { Button, Forms, React, Text } from "../../webpack/common";
import { Flex } from "../Flex";

const { FormSection, FormText, FormTitle } = Forms;

const getUser = lazyWebpack(filters.byCode(".USER(", "getUser"));
const UserSummaryItem = lazyWebpack(filters.byCode("defaultRenderUser", "showDefaultAvatarsForNullUsers"));
const Select = lazyWebpack(filters.byCode("optionClassName", "popoutPosition", "autoFocus", "maxVisibleItems"));
const TextInput = lazyWebpack(filters.byCode("defaultDirty", "getIsUnderFlowing", "getIsOverFlowing"));
const scrollerStyles = lazyWebpack(filters.byProps(["scrollerBase", "thin", "fade"]));
const createScroller = lazyWebpack(filters.byCode("orientation", "vertical", "paddingFix", "scrollerRef"));


export default function PluginModal(props: { plugin: Plugin; onRestartNeeded(): void; onClose(): void; } & Modals.ModalProps) {
    const { plugin } = props;

    const [authors, setAuthors] = React.useState<Partial<User>[]>([]);

    const pluginSettings = useSettings().plugins[plugin.name];

    React.useEffect(() => {
        (async () => {
            for (const user of plugin.authors) {
                const author = await getUser(user.id);
                setAuthors(a => [...a, author]);
            }
        })();
    }, []);

    function renderSettings() {
        if (!pluginSettings || !plugin.settings) {
            return <FormText>There are no settings for this plugin.</FormText>;
        }

        let options: JSX.Element[] = [];
        let i = 0;
        for (const setting of plugin.settings) {
            function onChange(newValue) {
                pluginSettings[setting.key] = newValue;
                setting.onChange?.(newValue);
                if (setting.restartNeeded) props.onRestartNeeded();
            }

            switch (setting.type) {
                case "select": {
                    options.push(<SettingSelectElement key={i++} setting={setting} onChange={onChange} pluginSettings={pluginSettings} />);
                    break;
                }
                case "string": {
                    options.push(<SettingInputElement key={i++} setting={setting} onChange={onChange} pluginSettings={pluginSettings} />);
                    break;
                }
                case "number": {
                    options.push(<SettingNumericElement key={i++} setting={setting} onChange={onChange} pluginSettings={pluginSettings} />);
                    break;
                }
                case "boolean": {
                    options.push(<SettingBooleanElement key={i++} setting={setting} onChange={onChange} pluginSettings={pluginSettings} />);
                }
            }
        }
        return <Flex flexDirection="column" style={{ gap: 12 }}>{options}</Flex>;
    }

    console.log({
        ModalRoot,
        ModalHeader,
        ModalContent,
        ModalFooter,
        ModalSize,
    });

    return (
        <ModalRoot transitionState={props.transitionState} size={ModalSize.LARGE}>
            <ModalHeader>
                <Text variant="heading-md/bold">{plugin.name}</Text>
            </ModalHeader>
            <ModalContent>
                <FormSection style={{ marginBottom: 8 }}>
                    <FormTitle tag="h3">About {plugin.name}</FormTitle>
                    <FormText>{plugin.description}</FormText>
                    <div style={{ marginTop: 8, width: "fit-content" }}>
                        <UserSummaryItem
                            users={authors}
                            count={plugin.authors.length}
                            guildId={undefined}
                            renderIcon={false}
                            max={6}
                            showDefaultAvatarsForNullUsers
                            showUserPopout
                        />
                    </div>
                </FormSection>
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
                        onClick={props.onClose}
                        size={Button.Sizes.SMALL}
                        color={Button.Colors.BRAND}
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

