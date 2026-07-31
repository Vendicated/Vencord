import { classNameFactory } from "@utils/css";
import { Flex } from "@components/Flex";
import {
    Button,
    ColorPicker,
    Forms,
    Switch,
    Text,
    TextInput,
    useRef,
    useState,
} from "@webpack/common";

import {
    createCustomBadgeId,
    DEFAULT_CUSTOM_BADGE_COLOR,
    type CustomBadgeDefinition,
} from "../customBadges";
import { CustomBadgeVisual } from "./CustomBadgeVisual";

const cl = classNameFactory("vc-custom-profile-");

interface CustomBadgeEditorProps {
    badges: CustomBadgeDefinition[];
    onChange: (badges: CustomBadgeDefinition[]) => void;
}

function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

export function CustomBadgeEditor({
    badges,
    onChange,
}: CustomBadgeEditorProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [name, setName] = useState("");
    const [color, setColor] = useState(DEFAULT_CUSTOM_BADGE_COLOR);
    const [icon, setIcon] = useState("");

    const addBadge = () => {
        const trimmedName = name.trim();
        const trimmedIcon = icon.trim();
        if (!trimmedName) return;

        onChange([
            ...badges,
            {
                id: createCustomBadgeId(),
                name: trimmedName,
                color,
                icon: trimmedIcon || "★",
                enabled: true,
            },
        ]);

        setName("");
        setIcon("");
        setColor(DEFAULT_CUSTOM_BADGE_COLOR);
    };

    const updateBadge = (id: string, patch: Partial<CustomBadgeDefinition>) => {
        onChange(
            badges.map((badge) =>
                badge.id === id ? { ...badge, ...patch } : badge,
            ),
        );
    };

    const removeBadge = (id: string) => {
        onChange(badges.filter((badge) => badge.id !== id));
    };

    const onFileSelected = async (file: File | null) => {
        if (!file || !file.type.startsWith("image/")) return;
        try {
            setIcon(await readFileAsDataUrl(file));
        } catch {
            // ignore read errors
        }
    };

    const previewBadge: CustomBadgeDefinition = {
        id: "preview",
        name: name.trim() || "Preview",
        color,
        icon: icon.trim() || "★",
        enabled: true,
    };

    return (
        <div className={cl("custom-badges")}>
            <div className={cl("custom-badge-form")}>
                <div className={cl("custom-badge-preview-wrap")}>
                    <CustomBadgeVisual badge={previewBadge} />
                    <Text variant="text-xs/medium">{previewBadge.name}</Text>
                </div>

                <div className={cl("custom-badge-fields")}>
                    <TextInput
                        value={name}
                        onChange={setName}
                        placeholder="Badge name"
                    />
                    <TextInput
                        value={icon}
                        onChange={setIcon}
                        placeholder="Icon URL, emoji, or upload below"
                    />
                    <Flex gap="0.75em" alignItems="center">
                        <ColorPicker
                            color={color}
                            label={
                                <Text
                                    variant="text-xs/normal"
                                    style={{ marginTop: 4 }}
                                >
                                    Color
                                </Text>
                            }
                            onChange={setColor}
                        />
                        <Button
                            size={Button.Sizes.SMALL}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            Upload icon
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={(e) => {
                                void onFileSelected(
                                    e.currentTarget.files?.[0] ?? null,
                                );
                                e.currentTarget.value = "";
                            }}
                        />
                    </Flex>
                    <Button
                        disabled={!name.trim()}
                        onClick={addBadge}
                        size={Button.Sizes.SMALL}
                    >
                        Add badge
                    </Button>
                </div>
            </div>

            {badges.length > 0 && (
                <div className={cl("custom-badge-list")}>
                    <Forms.FormText className={cl("custom-badge-hint")}>
                        Your custom badges appear on your profile when enabled.
                    </Forms.FormText>
                    {badges.map((badge) => (
                        <div key={badge.id} className={cl("custom-badge-item")}>
                            <CustomBadgeVisual badge={badge} />
                            <div className={cl("custom-badge-item-info")}>
                                <span>{badge.name}</span>
                                <span className={cl("custom-badge-item-color")}>
                                    #{badge.color.toString(16).padStart(6, "0")}
                                </span>
                            </div>
                            <Switch
                                value={badge.enabled}
                                onChange={(enabled) =>
                                    updateBadge(badge.id, { enabled })
                                }
                            />
                            <Button
                                look={Button.Looks.LINK}
                                color={Button.Colors.RED}
                                size={Button.Sizes.SMALL}
                                onClick={() => removeBadge(badge.id)}
                            >
                                Delete
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
