import { Flex } from "@components/Flex";
import { Button, ColorPicker, Text } from "@webpack/common";

import { copyProfileTheme3y3 } from "../profileTheme";

interface ProfileThemePickerProps {
    primary: number;
    accent: number;
    onPrimaryChange: (color: number) => void;
    onAccentChange: (color: number) => void;
}

export function ProfileThemePicker({
    primary,
    accent,
    onPrimaryChange,
    onAccentChange,
}: ProfileThemePickerProps) {
    return (
        <Flex className="vc-custom-profile-theme-row" gap="1em">
            <ColorPicker
                color={primary}
                label={
                    <Text variant="text-xs/normal" style={{ marginTop: 4 }}>
                        Primary
                    </Text>
                }
                onChange={onPrimaryChange}
            />
            <ColorPicker
                color={accent}
                label={
                    <Text variant="text-xs/normal" style={{ marginTop: 4 }}>
                        Accent
                    </Text>
                }
                onChange={onAccentChange}
            />
            <Button
                onClick={() => copyProfileTheme3y3(primary, accent)}
                color={Button.Colors.PRIMARY}
                size={Button.Sizes.XLARGE}
                className="vc-custom-profile-copy-3y3"
            >
                Copy 3y3
            </Button>
        </Flex>
    );
}
