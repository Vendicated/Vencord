import { User } from "discord-types/general";
import { Constructor } from "type-fest";

import { generateId } from "../../api/Commands";
import { useSettings } from "../../api/settings";
import { lazyWebpack, proxyLazy } from "../../utils";
import { ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize } from "../../utils/modal";
import { Plugin, SettingType } from "../../utils/types";
import { filters } from "../../webpack";
import { Button, FluxDispatcher, Forms, React, Text, Tooltip, UserStore, UserUtils } from "../../webpack/common";
import ErrorBoundary from "../ErrorBoundary";
import { Flex } from "../Flex";
import {
    SettingBooleanComponent,
    SettingInputComponent,
    SettingNumericComponent,
    SettingSelectComponent,
} from "./components";

const { FormSection, FormText, FormTitle } = Forms;

const UserSummaryItem = lazyWebpack(filters.byCode("defaultRenderUser", "showDefaultAvatarsForNullUsers"));
const AvatarStyles = lazyWebpack(filters.byProps(["moreUsers", "emptyUser", "avatarContainer", "clickableAvatar"]));
const UserRecord: Constructor<Partial<User>> = proxyLazy(() => UserStore.getCurrentUser().constructor) as any;

interface PluginModalProps extends ModalProps {
    plugin: Plugin;
    onRestartNeeded(): void;
}

/** To stop discord making unwanted requests... */
function makeDummyUser(user: { name: string, id: BigInt; }) {
    const newUser = new UserRecord({
        username: user.name,
        id: generateId(),
        bot: true,
    });
    FluxDispatcher.dispatch({
        type: "USER_UPDATE",
        user: newUser,
    });
    return newUser;
}

export default function PluginModal({ plugin, onRestartNeeded, onClose, transitionState }: PluginModalProps) {
    const [authors, setAuthors] = React.useState<Partial<User>[]>([]);

    const pluginSettings = useSettings().plugins[plugin.name];

    const [tempSettings, setTempSettings] = React.useState<Record<string, any>>({});

    const [errors, setErrors] = React.useState<Record<string, boolean>>({});

    const canSubmit = () => Object.values(errors).every(e => !e);

    React.useEffect(() => {
        (async () => {
            for (const user of plugin.authors.slice(0, 6)) {
                const author = user.id ? await UserUtils.getUser(user.id).catch(() => null) : makeDummyUser(user);
                setAuthors(a => [...a, author || makeDummyUser(user)]);
            }
        })();
    }, []);

    function saveAndClose() {
        if (!plugin.settings) {
            onClose();
            return;
        }
        let restartNeeded = false;
        for (const [key, value] of Object.entries(tempSettings)) {
            const setting = plugin.settings[key];
            pluginSettings[key] = value;
            setting?.onChange?.(value);
            if (setting?.restartNeeded) restartNeeded = true;
        }
        if (restartNeeded) onRestartNeeded();
        onClose();
    }

    function renderSettings() {
        if (!pluginSettings || !plugin.settings) {
            return <FormText>There are no settings for this plugin.</FormText>;
        }

        const options: JSX.Element[] = [];
        for (const [key, setting] of Object.entries(plugin.settings)) {
            function onChange(newValue) {
                setTempSettings(s => ({ ...s, [key]: newValue }));
            }

            function onError(hasError: boolean) {
                setErrors(e => ({ ...e, [key]: hasError }));
            }

            const props = { onChange, pluginSettings, id: key, onError };
            switch (setting.type) {
                case SettingType.SELECT: {
                    options.push(<SettingSelectComponent key={key} setting={setting} {...props} />);
                    break;
                }
                case SettingType.STRING: {
                    options.push(<SettingInputComponent key={key} setting={setting} {...props} />);
                    break;
                }
                case SettingType.NUMBER:
                case SettingType.BIGINT: {
                    options.push(<SettingNumericComponent key={key} setting={setting} {...props} />);
                    break;
                }
                case SettingType.BOOLEAN: {
                    options.push(<SettingBooleanComponent key={key} setting={setting} {...props} />);
                }
            }
        }
        return <Flex flexDirection="column" style={{ gap: 12 }}>{options}</Flex>;
    }

    function renderMoreUsers(_label: string, count: number) {
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
        <ModalRoot transitionState={transitionState} size={ModalSize.MEDIUM}>
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
                {!!plugin.settingsAboutComponent && (
                    <div style={{ marginBottom: 8 }}>
                        <FormSection>
                            <ErrorBoundary message="An error occurred while rendering this plugin's custom InfoComponent">
                                <plugin.settingsAboutComponent />
                            </ErrorBoundary>
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
                        onClick={onClose}
                        size={Button.Sizes.SMALL}
                        color={Button.Colors.RED}
                    >
                        Exit Without Saving
                    </Button>
                    <Tooltip text="You must fix all errors before saving" shouldShow={!canSubmit()}>
                        {({ onMouseEnter, onMouseLeave }) => (
                            <Button
                                size={Button.Sizes.SMALL}
                                color={Button.Colors.BRAND}
                                onClick={saveAndClose}
                                onMouseEnter={onMouseEnter}
                                onMouseLeave={onMouseLeave}
                                disabled={!canSubmit()}
                            >
                                Save & Exit
                            </Button>
                        )}
                    </Tooltip>
                </Flex>
            </ModalFooter>
        </ModalRoot>
    );
}
