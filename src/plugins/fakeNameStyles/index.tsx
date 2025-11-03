/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { fetchUserProfile } from "@utils/discord";
import { copyWithToast } from "@utils/misc";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { useAwaiter } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { User } from "@vencord/discord-types";
import { Button, ColorPicker, Flex, Forms, UserProfileStore, UserStore, useState } from "@webpack/common";
import virtualMerge from "virtual-merge";

interface DisplayNameStyle {
    fontId: number;
    effectId: number;
    colors: [number, number?];
}

function calculateColorVariants(mainColor: number) {
    const r = (mainColor >> 16) & 0xff;
    const g = (mainColor >> 8) & 0xff;
    const b = mainColor & 0xff;

    // rgb to hsl
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2 / 255;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (510 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    // hsl to hex
    function hslToHex(h: number, s: number, l: number) {
        let r: number, g: number, b: number;

        if (s === 0) {
            r = g = b = l; // achromatic
        } else {
            const hue2rgb = (p: number, q: number, t: number) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }

        const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    return {
        mainColor: hslToHex(h, s, l),
        light1Color: hslToHex(h, s, Math.min(l * 1.2, 1)),
        light2Color: hslToHex(h, s, Math.min(l * 1.5, 1)),
        dark1Color: hslToHex(h, s, Math.max(l * 0.7, 0)),
        dark2Color: hslToHex(h, s, Math.max(l * 0.4, 0)),
    };
}

const FONT_MAP = {
    "gg sans": "gg sans",
    "Tempo": "zillaSlab",
    "Sakura": "cherryBomb",
    "Jellybean": "chicle",
    "Modern": "museoModerno",
    "Medieval": "neoCastel",
    "Vampyre": "sinistre",
    "8Bit": "pixelify"
};

const FONT_IDS = {
    3: "Sakura",
    4: "Jellybean",
    6: "Modern",
    7: "Medieval",
    8: "8Bit",
    10: "Vampyre",
    11: "gg sans",
    12: "Tempo",
};

const EFFECT_IDS = {
    1: "solid",
    2: "gradient",
    3: "neon",
    4: "toon",
    5: "pop"
};

const EFFECT_MAP = {
    "solid": "solid",
    "gradient": "gradient",
    "neon": "neon",
    "toon": "toon",
    "pop": "pop"
};

const PALETTE = [
    0xefeff0,
    0x18daad, 0x24e36d, 0x1c98eb, 0xc32aff, 0xfc1965, 0xc6a615,
    0x0a9d7b, 0x0fad4b, 0x0b69a7, 0xa913e5, 0xda0149, 0xf93722
];

function encode(fontId: number, effectId: number, colors: [number, number]): string {
    const colorStr = `#${colors[0].toString(16).padStart(6, "0")},#${colors[1].toString(16).padStart(6, "0")}`;
    const message = `[${fontId},${effectId},${colorStr}]`;
    const padding = "";
    const encoded = Array.from(message)
        .map(x => x.codePointAt(0))
        .filter(x => x! >= 0x20 && x! <= 0x7f)
        .map(x => String.fromCodePoint(x! + 0xe0000))
        .join("");

    return (padding || "") + " " + encoded;
}

function decode(bio: string): DisplayNameStyle | null {
    if (bio == null) {
        return null;
    }

    const styleString = bio.match(
        /\u{e005b}([\u{e0020}-\u{e007e}]+?)\u{e002c}([\u{e0020}-\u{e007e}]+?)\u{e002c}(.*?)\u{e005d}/u,
    );

    if (styleString != null) {
        const parsed = [...styleString[0]]
            .map(x => String.fromCodePoint(x.codePointAt(0)! - 0xe0000))
            .join("");

        const parts = parsed.substring(1, parsed.length - 1).split(",");
        if (parts.length >= 3) {
            const colorPart = parts.slice(2).join(",");
            const colors = colorPart.split(",").map(c => parseInt(c.replace("#", "0x"), 16));

            const result = {
                fontId: parseInt(parts[0]),
                effectId: parseInt(parts[1]),
                colors: colors as [number, number]
            };

            return result;
        }
    } else {
    }

    return null;
}

const settings = definePluginSettings({
    stylePriority: {
        description: "Default style source if both are present",
        type: OptionType.SELECT,
        options: [
            { label: "Nitro Styles", value: true, default: true },
            { label: "Fake Styles", value: false },
        ]
    }
});

function SettingsAboutComponentWrapper() {
    const [, , userProfileLoading] = useAwaiter(() => fetchUserProfile(UserStore.getCurrentUser().id));

    return !userProfileLoading && <SettingsAboutComponent />;
}

function NamePreview({ size, font=11, effect=1, animated, color1=0xefeff0, color2=0xff69b4, displayName }) {
    const fontString = FONT_MAP[FONT_IDS[font]];
    const effectString = EFFECT_IDS[effect];
    const colors = calculateColorVariants(color1);
    const style = {
        "--custom-display-name-styles-main-color": colors.mainColor,
        "--custom-display-name-styles-light-1-color": colors.light1Color,
        "--custom-display-name-styles-light-2-color": colors.light2Color,
        "--custom-display-name-styles-dark-1-color": colors.dark1Color,
        "--custom-display-name-styles-dark-2-color": colors.dark2Color,
        "--custom-display-name-styles-gradient-start-color": colors.mainColor,
        "--custom-display-name-styles-gradient-end-color": `#${color2.toString(16).padStart(6, "0")}`,
        "--custom-display-name-styles-wrap": "wrap",
        "--custom-display-name-styles-font-opacity": "1",
        margin: "16px 0",
        width: "fit-content",
        marginInline: "auto",
    };

    const fontClass = fontString !== "gg sans" ? `dnsFont__89a31 ${fontString}__89a31` : "";
    const baseClass = `container_dfb989 ${fontClass} nicknameWithDisplayNameStyles__63ed3 showEffect_dfb989 inProfile_dfb989`;

    return (
        <div className={`${baseClass} ${size} ${animated ? "animated_dfb989 loop_dfb989" : ""}`} style={style}>
            <span
                data-username-with-effects={displayName}
                className={`innerContainer_dfb989 ${animated ? "animated_dfb989" : ""} ${effectString}_dfb989`}
            >
                {displayName}
            </span>
            {effectString === "neon" && (
                <span className="glowContainer_dfb989 innerContainer_dfb989 neonGlow_dfb989">
                    {displayName}
                </span>
            )}
        </div>
    );
}

function StyleEditorModal({ modalProps }: { modalProps: ModalProps; }) {
    const existingStyle = decode(
        UserProfileStore.getUserProfile(UserStore.getCurrentUser().id)?.bio ?? ""
    ) ?? { fontId: 11, effectId: 1, colors: [0xefeff0, undefined] };

    const [font, setFont] = useState(existingStyle.fontId);
    const [effect, setEffect] = useState(existingStyle.effectId);
    const [color1, setColor1] = useState(existingStyle.colors[0]);
    const [color2, setColor2] = useState(existingStyle.colors[1] || 0xff69b4);

    const currentUser = UserStore.getCurrentUser();
    const displayName = currentUser?.globalName || currentUser?.username || "couldn't get your name";

    const animated = ["pop", "neon", "toon"].includes(EFFECT_IDS[effect]);

    return (
        <ModalRoot {...modalProps} size={ModalSize.MEDIUM}>
            <ModalHeader>
                <Forms.FormTitle tag="h2" style={{ margin: 0, flexGrow: 1 }}>
                    Style Editor
                </Forms.FormTitle>
                <ModalCloseButton onClick={modalProps.onClose} />
            </ModalHeader>

            <ModalContent style={{ padding: 16 }}>
                <div className="previewBox">
                    <Forms.FormTitle tag="h3" style={{ opacity: 0.7 }}>Preview</Forms.FormTitle>

                    <NamePreview size="heading-lg/bold_cf4812" {...{ font, effect, animated, color1, color2, displayName }} />
                    <NamePreview size="heading-xl/semibold_cf4812" {...{ font, effect, animated, color1, color2, displayName }} />
                    <NamePreview size="usernameFont__07f91" {...{ font, effect, animated, color1, color2, displayName }} />
                </div>

                <div style={{ marginBottom: "20px" }}>
                    <Forms.FormTitle tag="h4" style={{ margin: "8px" }}>Fonts</Forms.FormTitle>
                    <br />
                    <Flex direction={Flex.Direction.HORIZONTAL} style={{ gap: "8px", flexWrap: "wrap" }}>
                        {Object.keys(FONT_MAP).map(f => (
                            <Button
                                key={f}
                                size={Button.Sizes.SMALL}
                                color={f === FONT_IDS[font] ? Button.Colors.BRAND : Button.Colors.PRIMARY}
                                onClick={() => {
                                    const entry = Object.entries(FONT_IDS).find(([, value]) => value === f);
                                    setFont(entry ? parseInt(entry[0]) : 1);
                                }}
                            >
                                {f}
                            </Button>
                        ))}
                    </Flex>
                </div>

                <div style={{ marginBottom: "20px" }}>
                    <Forms.FormTitle tag="h4">Effects</Forms.FormTitle>
                    <br />
                    <Flex direction={Flex.Direction.HORIZONTAL} style={{ gap: "8px", flexWrap: "wrap" }}>
                        {Object.keys(EFFECT_MAP).map(e => (
                            <Button
                                key={e}
                                size={Button.Sizes.SMALL}
                                color={e === EFFECT_IDS[effect] ? Button.Colors.BRAND : Button.Colors.PRIMARY}
                                onClick={() => {
                                    const entry = Object.entries(EFFECT_IDS).find(([, value]) => value === e);
                                    setEffect(entry ? parseInt(entry[0]) : 1);
                                }}
                            >
                                {e}
                            </Button>
                        ))}
                    </Flex>
                </div>

                <div style={{ marginBottom: "20px" }}>
                    <Forms.FormTitle tag="h4">Colors</Forms.FormTitle>
                    <br />
                    <Flex direction={Flex.Direction.HORIZONTAL} style={{ gap: "16px", marginBottom: "16px" }}>
                        <div>
                            <Forms.FormTitle tag="h5">
                                {EFFECT_IDS[effect] === "pop" ? "shadow color" : "primary color"}
                            </Forms.FormTitle>
                            <ColorPicker
                                color={color1}
                                onChange={value => setColor1(value ?? 0)}
                                showEyeDropper={false}
                            />
                        </div>
                        {EFFECT_IDS[effect] === "gradient" && (
                            <div>
                                <Forms.FormTitle tag="h5">secondary color</Forms.FormTitle>
                                <ColorPicker
                                    color={color2}
                                    onChange={value => setColor2(value ?? 0)}
                                    showEyeDropper={false}
                                />
                            </div>
                        )}
                    </Flex>

                    <Forms.FormTitle tag="h5">Preset Colors</Forms.FormTitle>
                    <Flex direction={Flex.Direction.HORIZONTAL} style={{ gap: "8px", flexWrap: "wrap" }}>
                        {PALETTE.map(c => (
                            <Button
                                key={c}
                                size={Button.Sizes.SMALL}
                                color={c === color1 ? Button.Colors.BRAND : Button.Colors.PRIMARY}
                                onClick={() => setColor1(c)}
                                style={{
                                    backgroundColor: `#${c.toString(16).padStart(6, "0")}`,
                                    width: "40px",
                                    minWidth: "40px"
                                }}
                            >
                                {" "}
                            </Button>
                        ))}
                    </Flex>
                </div>
            </ModalContent>

            <ModalFooter>
                <Flex direction={Flex.Direction.HORIZONTAL} justify={Flex.Justify.BETWEEN} style={{ width: "100%" }}>
                    <Button
                        color={Button.Colors.PRIMARY}
                        onClick={modalProps.onClose}
                    >
                        Cancel
                    </Button>
                    <Button
                        color={Button.Colors.BRAND}
                        onClick={() => {
                            const needsSecondColor = EFFECT_IDS[effect] === "gradient";
                            const styleString = encode(font, effect, [color1, needsSecondColor ? color2 : color1]);
                            copyWithToast(styleString, "3y3 copied :3");
                            modalProps.onClose();
                        }}
                    >
                        Copy 3y3
                    </Button>
                </Flex>
            </ModalFooter>
        </ModalRoot>
    );
}

function SettingsAboutComponent() {
    const openStyleModal = () => {
        openModal(props => <StyleEditorModal modalProps={props} />);
    };

    return (
        <section>
            <Forms.FormText style={{ fontSize: "14px", opacity: 0.8, marginTop: "16px" }}>
                <strong>How to use:</strong>
                <br />
                1. Click "open Style Editor" to customize your display name
                <br />
                2. Choose your font, effect, and color (or colors)
                <br />
                3. Click "copy 3y3"
                <br />
                4. Paste that anywhere in your bio
            </Forms.FormText>

            <div style={{ margin: "16px 0" }}>
                <Button
                    color={Button.Colors.BRAND}
                    onClick={openStyleModal}
                    style={{ marginRight: "8px" }}
                >
                    open Style Editor
                </Button>
            </div>
        </section>
    );
}


export default definePlugin({
    name: "FakeNameStyles",
    description: "Allows display name styles by hiding the info in your bio thanks to more invisible 3y3 encoding",
    authors: [Devs.peasoup],

    patches: [
        {
            find: '"UserStore"',
            replacement: {
                match: /(?<=getUser(?!\w)[^{]*{[^{}]*return )([^;}]+)/,
                replace: "$self.styleDecodeHook($1)"
            }
        },
    ],

    settingsAboutComponent: SettingsAboutComponentWrapper,

    settings,

    styleDecodeHook(user: User) {
        if (!user) return user;

        const bio = UserProfileStore.getUserProfile(user.id)?.bio;
        if (bio) {
            if (settings.store.stylePriority && user.displayNameStyles !== null && user.displayNameStyles !== undefined) return user;

            const style = decode(bio);
            if (style) {
                const mergedStyle = {
                    fontId: style.fontId || 11,
                    effectId: style.effectId || 1,
                    colors: style.colors || [0xefeff0, 0xff69b4],
                };

                const merge = virtualMerge(user, {
                    displayNameStyles: mergedStyle
                });

                return merge;
            }
        }
        return user;
    },
});
