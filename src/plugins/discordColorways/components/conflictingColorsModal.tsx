/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot } from "@utils/modal";
import { Button, Forms, ScrollerThin, Text, useState } from "@webpack/common";

import { knownThemeVars } from "../constants";
import { getFontOnBg, getHex } from "../utils";

export function ConflictingColorsModal({
    modalProps,
    onFinished
}: {
    modalProps: ModalProps;
    onFinished: ({ accent, primary, secondary, tertiary }: { accent: string, primary: string, secondary: string, tertiary: string; }) => void;
}) {
    const [accentColor, setAccentColor] = useState<string>(getHex(
        getComputedStyle(
            document.body
        ).getPropertyValue("--brand-experiment")
    ));
    const [primaryColor, setPrimaryColor] = useState<string>(getHex(
        getComputedStyle(
            document.body
        ).getPropertyValue("--background-primary")
    ));
    const [secondaryColor, setSecondaryColor] = useState<string>(getHex(
        getComputedStyle(
            document.body
        ).getPropertyValue("--background-secondary")
    ));
    const [tertiaryColor, setTertiaryColor] = useState<string>(getHex(
        getComputedStyle(
            document.body
        ).getPropertyValue("--background-tertiary")
    ));
    return <ModalRoot {...modalProps} className="colorwayCreator-modal">
        <ModalHeader>
            <Text variant="heading-lg/semibold" tag="h1">
                Conflicting Colors Found
            </Text>
        </ModalHeader>
        <ModalContent className="colorwayCreator-menuWrapper">
            <Text className="colorwaysConflictingColors-warning">Multiple known themes have been found, select the colors you want to copy from below:</Text>
            <Forms.FormTitle style={{ marginBottom: 0 }}>Colors to copy:</Forms.FormTitle>
            <div className="colorwayCreator-colorPreviews">
                <div className="colorwayCreator-colorPreview" style={{ backgroundColor: primaryColor, color: getFontOnBg(primaryColor) }} >Primary</div>
                <div className="colorwayCreator-colorPreview" style={{ backgroundColor: secondaryColor, color: getFontOnBg(secondaryColor) }} >Secondary</div>
                <div className="colorwayCreator-colorPreview" style={{ backgroundColor: tertiaryColor, color: getFontOnBg(tertiaryColor) }} >Tertiary</div>
                <div className="colorwayCreator-colorPreview" style={{ backgroundColor: accentColor, color: getFontOnBg(accentColor) }} >Accent</div>
            </div>
            <div className="colorwaysCreator-settingCat">
                <ScrollerThin orientation="vertical" className="colorwaysCreator-settingsList" paddingFix>
                    <div
                        id="colorways-colorstealer-item_Default"
                        className="colorwaysCreator-settingItm colorwaysCreator-colorPreviewItm"
                    >
                        <Forms.FormTitle>Discord</Forms.FormTitle>
                        <div className="colorwayCreator-colorPreviews">
                            <div
                                className="colorwayCreator-colorPreview" style={{
                                    backgroundColor: getHex(
                                        getComputedStyle(
                                            document.body
                                        ).getPropertyValue("--background-primary")
                                    ),
                                    color: getFontOnBg(
                                        getHex(
                                            getComputedStyle(
                                                document.body
                                            ).getPropertyValue("--background-primary")
                                        )
                                    )
                                }}
                                onClick={() => setPrimaryColor(
                                    getHex(
                                        getComputedStyle(
                                            document.body
                                        ).getPropertyValue("--background-primary")
                                    )
                                )}
                            >Primary</div>
                            <div
                                className="colorwayCreator-colorPreview" style={{
                                    backgroundColor: getHex(
                                        getComputedStyle(
                                            document.body
                                        ).getPropertyValue("--background-secondary")
                                    ),
                                    color: getFontOnBg(
                                        getHex(
                                            getComputedStyle(
                                                document.body
                                            ).getPropertyValue("--background-secondary")
                                        )
                                    )
                                }}
                                onClick={() => setSecondaryColor(
                                    getHex(
                                        getComputedStyle(
                                            document.body
                                        ).getPropertyValue("--background-secondary")
                                    )
                                )}
                            >Secondary</div>
                            <div
                                className="colorwayCreator-colorPreview" style={{
                                    backgroundColor: getHex(
                                        getComputedStyle(
                                            document.body
                                        ).getPropertyValue("--background-tertiary")
                                    ),
                                    color: getFontOnBg(
                                        getHex(
                                            getComputedStyle(
                                                document.body
                                            ).getPropertyValue("--background-tertiary")
                                        )
                                    )
                                }}
                                onClick={() => setTertiaryColor(
                                    getHex(
                                        getComputedStyle(
                                            document.body
                                        ).getPropertyValue("--background-tertiary")
                                    )
                                )}
                            >Tertiary</div>
                            <div
                                className="colorwayCreator-colorPreview" style={{
                                    backgroundColor: getHex(
                                        getComputedStyle(
                                            document.body
                                        ).getPropertyValue("--brand-experiment")
                                    ),
                                    color: getFontOnBg(
                                        getHex(
                                            getComputedStyle(
                                                document.body
                                            ).getPropertyValue("--brand-experiment")
                                        )
                                    )
                                }}
                                onClick={() => setAccentColor(
                                    getHex(
                                        getComputedStyle(
                                            document.body
                                        ).getPropertyValue("--brand-experiment")
                                    )
                                )}
                            >Accent</div>
                        </div>
                    </div>
                    {Object.values(knownThemeVars).map((theme: any, i) => {
                        if (getComputedStyle(document.body).getPropertyValue(theme.variable)) {
                            return (
                                <div
                                    id={
                                        "colorways-colorstealer-item_" +
                                        Object.keys(knownThemeVars)[i]
                                    }
                                    className="colorwaysCreator-settingItm colorwaysCreator-colorPreviewItm"
                                >
                                    <Forms.FormTitle>{Object.keys(knownThemeVars)[i] + (theme.alt ? " (Main)" : "")}</Forms.FormTitle>
                                    <div className="colorwayCreator-colorPreviews">
                                        {theme.primary && getComputedStyle(document.body).getPropertyValue(theme.primary).match(/^\d.*%$/)
                                            ? <div
                                                className="colorwayCreator-colorPreview colorwayCreator-colorPreview_primary"
                                                style={{
                                                    backgroundColor: getHex(`hsl(${getComputedStyle(document.body).getPropertyValue(theme.primary)})`),
                                                    color: getFontOnBg(getHex(`hsl(${getComputedStyle(document.body).getPropertyValue(theme.primary)})`))
                                                }}
                                                onClick={() => {
                                                    setPrimaryColor(getHex(`hsl(${getComputedStyle(document.body).getPropertyValue(theme.primary)})`));
                                                }}
                                            >Primary</div>
                                            : (
                                                theme.primary
                                                    ? <div
                                                        className="colorwayCreator-colorPreview colorwayCreator-colorPreview_primary"
                                                        style={{
                                                            backgroundColor: getHex(getComputedStyle(document.body).getPropertyValue(theme.primary)),
                                                            color: getFontOnBg(getHex(getComputedStyle(document.body).getPropertyValue(theme.primary)))
                                                        }}
                                                        onClick={() => {
                                                            setPrimaryColor(getHex(getComputedStyle(document.body).getPropertyValue(theme.primary)));
                                                        }}
                                                    >Primary</div>
                                                    : (theme.primaryVariables
                                                        && <div
                                                            className="colorwayCreator-colorPreview colorwayCreator-colorPreview_primary"
                                                            style={{ backgroundColor: `hsl(${getComputedStyle(document.body).getPropertyValue(theme.primaryVariables.h)} ${!getComputedStyle(document.body).getPropertyValue(theme.primaryVariables.s).includes("%") ? (getComputedStyle(document.body).getPropertyValue(theme.primaryVariables.s) + "%") : getComputedStyle(document.body).getPropertyValue(theme.primaryVariables.s)} ${!getComputedStyle(document.body).getPropertyValue(theme.primaryVariables.l).includes("%") ? (getComputedStyle(document.body).getPropertyValue(theme.primaryVariables.l) + "%") : getComputedStyle(document.body).getPropertyValue(theme.primaryVariables.l)})`, color: getFontOnBg(getHex(`hsl(${getComputedStyle(document.body).getPropertyValue(theme.primaryVariables.h)} ${!getComputedStyle(document.body).getPropertyValue(theme.primaryVariables.s).includes("%") ? (getComputedStyle(document.body).getPropertyValue(theme.primaryVariables.s) + "%") : getComputedStyle(document.body).getPropertyValue(theme.primaryVariables.s)} ${!getComputedStyle(document.body).getPropertyValue(theme.primaryVariables.l).includes("%") ? (getComputedStyle(document.body).getPropertyValue(theme.primaryVariables.l) + "%") : getComputedStyle(document.body).getPropertyValue(theme.primaryVariables.l)})`)) }}
                                                            onClick={() => {
                                                                setPrimaryColor(getHex(`hsl(${getComputedStyle(document.body).getPropertyValue(theme.primaryVariables.h)} ${!getComputedStyle(document.body).getPropertyValue(theme.primaryVariables.s).includes("%") ? (getComputedStyle(document.body).getPropertyValue(theme.primaryVariables.s) + "%") : getComputedStyle(document.body).getPropertyValue(theme.primaryVariables.s)} ${!getComputedStyle(document.body).getPropertyValue(theme.primaryVariables.l).includes("%") ? (getComputedStyle(document.body).getPropertyValue(theme.primaryVariables.l) + "%") : getComputedStyle(document.body).getPropertyValue(theme.primaryVariables.l)})`));
                                                            }}
                                                        >Primary</div>))
                                        }
                                        {theme.secondary && getComputedStyle(document.body).getPropertyValue(theme.secondary).match(/^\d.*%$/)
                                            ? <div
                                                className="colorwayCreator-colorPreview colorwayCreator-colorPreview_secondary"
                                                style={{
                                                    backgroundColor: getHex(`hsl(${getComputedStyle(document.body).getPropertyValue(theme.secondary)})`),
                                                    color: getFontOnBg(getHex(`hsl(${getComputedStyle(document.body).getPropertyValue(theme.secondary)})`))
                                                }}
                                                onClick={() => {
                                                    setSecondaryColor(getHex(`hsl(${getComputedStyle(document.body).getPropertyValue(theme.secondary)})`));
                                                }}
                                            >Secondary</div>
                                            : (theme.secondary
                                                ? <div
                                                    className="colorwayCreator-colorPreview colorwayCreator-colorPreview_secondary"
                                                    style={{
                                                        backgroundColor: getHex(getComputedStyle(document.body).getPropertyValue(theme.secondary)),
                                                        color: getFontOnBg(getHex(getComputedStyle(document.body).getPropertyValue(theme.secondary)))
                                                    }}
                                                    onClick={() => {
                                                        setSecondaryColor(getHex(getComputedStyle(document.body).getPropertyValue(theme.secondary)));
                                                    }}
                                                >Secondary</div>
                                                : (theme.secondaryVariables
                                                    && <div
                                                        className="colorwayCreator-colorPreview colorwayCreator-colorPreview_secondary"
                                                        style={{ backgroundColor: `hsl(${getComputedStyle(document.body).getPropertyValue(theme.secondaryVariables.h)} ${!getComputedStyle(document.body).getPropertyValue(theme.secondaryVariables.s).includes("%") ? (getComputedStyle(document.body).getPropertyValue(theme.secondaryVariables.s) + "%") : getComputedStyle(document.body).getPropertyValue(theme.secondaryVariables.s)} ${!getComputedStyle(document.body).getPropertyValue(theme.secondaryVariables.l).includes("%") ? (getComputedStyle(document.body).getPropertyValue(theme.secondaryVariables.l) + "%") : getComputedStyle(document.body).getPropertyValue(theme.secondaryVariables.l)})`, color: getFontOnBg(getHex(`hsl(${getComputedStyle(document.body).getPropertyValue(theme.secondaryVariables.h)} ${!getComputedStyle(document.body).getPropertyValue(theme.secondaryVariables.s).includes("%") ? (getComputedStyle(document.body).getPropertyValue(theme.secondaryVariables.s) + "%") : getComputedStyle(document.body).getPropertyValue(theme.secondaryVariables.s)} ${!getComputedStyle(document.body).getPropertyValue(theme.secondaryVariables.l).includes("%") ? (getComputedStyle(document.body).getPropertyValue(theme.secondaryVariables.l) + "%") : getComputedStyle(document.body).getPropertyValue(theme.secondaryVariables.l)})`)) }}
                                                        onClick={() => {
                                                            setSecondaryColor(getHex(`hsl(${getComputedStyle(document.body).getPropertyValue(theme.secondaryVariables.h)} ${!getComputedStyle(document.body).getPropertyValue(theme.secondaryVariables.s).includes("%") ? (getComputedStyle(document.body).getPropertyValue(theme.secondaryVariables.s) + "%") : getComputedStyle(document.body).getPropertyValue(theme.secondaryVariables.s)} ${!getComputedStyle(document.body).getPropertyValue(theme.secondaryVariables.l).includes("%") ? (getComputedStyle(document.body).getPropertyValue(theme.secondaryVariables.l) + "%") : getComputedStyle(document.body).getPropertyValue(theme.secondaryVariables.l)})`));
                                                        }}
                                                    >Secondary</div>))
                                        }
                                        {theme.tertiary && getComputedStyle(document.body).getPropertyValue(theme.tertiary).match(/^\d.*%$/)
                                            ? <div
                                                className="colorwayCreator-colorPreview colorwayCreator-colorPreview_tertiary"
                                                style={{
                                                    backgroundColor: getHex(`hsl(${getComputedStyle(document.body).getPropertyValue(theme.tertiary)})`),
                                                    color: getFontOnBg(getHex(`hsl(${getComputedStyle(document.body).getPropertyValue(theme.tertiary)})`))
                                                }}
                                                onClick={() => {
                                                    setTertiaryColor(getHex(`hsl(${getComputedStyle(document.body).getPropertyValue(theme.tertiary)})`));
                                                }}
                                            >Tertiary</div>
                                            : (theme.tertiary
                                                ? <div
                                                    className="colorwayCreator-colorPreview colorwayCreator-colorPreview_tertiary"
                                                    style={{
                                                        backgroundColor: getHex(getComputedStyle(document.body).getPropertyValue(theme.tertiary)),
                                                        color: getFontOnBg(getHex(getComputedStyle(document.body).getPropertyValue(theme.tertiary)))
                                                    }}
                                                    onClick={() => {
                                                        setTertiaryColor(getHex(getComputedStyle(document.body).getPropertyValue(theme.tertiary)));
                                                    }}
                                                >Tertiary</div>
                                                : (theme.tertiaryVariables
                                                    && <div
                                                        className="colorwayCreator-colorPreview colorwayCreator-colorPreview_tertiary"
                                                        style={{ backgroundColor: `hsl(${getComputedStyle(document.body).getPropertyValue(theme.tertiaryVariables.h)} ${!getComputedStyle(document.body).getPropertyValue(theme.tertiaryVariables.s).includes("%") ? (getComputedStyle(document.body).getPropertyValue(theme.tertiaryVariables.s) + "%") : getComputedStyle(document.body).getPropertyValue(theme.tertiaryVariables.s)} ${!getComputedStyle(document.body).getPropertyValue(theme.tertiaryVariables.l).includes("%") ? (getComputedStyle(document.body).getPropertyValue(theme.tertiaryVariables.l) + "%") : getComputedStyle(document.body).getPropertyValue(theme.tertiaryVariables.l)})`, color: getFontOnBg(getHex(`hsl(${getComputedStyle(document.body).getPropertyValue(theme.tertiaryVariables.h)} ${!getComputedStyle(document.body).getPropertyValue(theme.tertiaryVariables.s).includes("%") ? (getComputedStyle(document.body).getPropertyValue(theme.tertiaryVariables.s) + "%") : getComputedStyle(document.body).getPropertyValue(theme.tertiaryVariables.s)} ${!getComputedStyle(document.body).getPropertyValue(theme.tertiaryVariables.l).includes("%") ? (getComputedStyle(document.body).getPropertyValue(theme.tertiaryVariables.l) + "%") : getComputedStyle(document.body).getPropertyValue(theme.tertiaryVariables.l)})`)) }}
                                                        onClick={() => {
                                                            setTertiaryColor(getHex(`hsl(${getComputedStyle(document.body).getPropertyValue(theme.tertiaryVariables.h)} ${!getComputedStyle(document.body).getPropertyValue(theme.tertiaryVariables.s).includes("%") ? (getComputedStyle(document.body).getPropertyValue(theme.tertiaryVariables.s) + "%") : getComputedStyle(document.body).getPropertyValue(theme.tertiaryVariables.s)} ${!getComputedStyle(document.body).getPropertyValue(theme.tertiaryVariables.l).includes("%") ? (getComputedStyle(document.body).getPropertyValue(theme.tertiaryVariables.l) + "%") : getComputedStyle(document.body).getPropertyValue(theme.tertiaryVariables.l)})`));
                                                        }}
                                                    >Tertiary</div>))}
                                        {theme.accent && getComputedStyle(document.body).getPropertyValue(theme.accent).match(/^\d.*%$/)
                                            ? <div
                                                className="colorwayCreator-colorPreview colorwayCreator-colorPreview_accent"
                                                style={{
                                                    backgroundColor: getHex(`hsl(${getComputedStyle(document.body).getPropertyValue(theme.accent)})`),
                                                    color: getFontOnBg(getHex(`hsl(${getComputedStyle(document.body).getPropertyValue(theme.accent)})`))
                                                }}
                                                onClick={() => {
                                                    setAccentColor(getHex(`hsl(${getComputedStyle(document.body).getPropertyValue(theme.accent)})`));
                                                }}
                                            >Accent</div>
                                            : (theme.accent
                                                ? <div
                                                    className="colorwayCreator-colorPreview colorwayCreator-colorPreview_accent"
                                                    style={{
                                                        backgroundColor: getHex(getComputedStyle(document.body).getPropertyValue(theme.accent)),
                                                        color: getFontOnBg(getHex(getComputedStyle(document.body).getPropertyValue(theme.accent)))
                                                    }}
                                                    onClick={() => {
                                                        setAccentColor(getHex(getComputedStyle(document.body).getPropertyValue(theme.accent)));
                                                    }}
                                                >Accent</div>
                                                : (theme.accentVariables
                                                    && <div
                                                        className="colorwayCreator-colorPreview colorwayCreator-colorPreview_accent"
                                                        style={{ backgroundColor: `hsl(${getComputedStyle(document.body).getPropertyValue(theme.accentVariables.h)} ${!getComputedStyle(document.body).getPropertyValue(theme.accentVariables.s).includes("%") ? (getComputedStyle(document.body).getPropertyValue(theme.accentVariables.s) + "%") : getComputedStyle(document.body).getPropertyValue(theme.accentVariables.s)} ${!getComputedStyle(document.body).getPropertyValue(theme.accentVariables.l).includes("%") ? (getComputedStyle(document.body).getPropertyValue(theme.accentVariables.l) + "%") : getComputedStyle(document.body).getPropertyValue(theme.accentVariables.l)})`, color: getFontOnBg(getHex(`hsl(${getComputedStyle(document.body).getPropertyValue(theme.accentVariables.h)} ${!getComputedStyle(document.body).getPropertyValue(theme.accentVariables.s).includes("%") ? (getComputedStyle(document.body).getPropertyValue(theme.accentVariables.s) + "%") : getComputedStyle(document.body).getPropertyValue(theme.accentVariables.s)} ${!getComputedStyle(document.body).getPropertyValue(theme.accentVariables.l).includes("%") ? (getComputedStyle(document.body).getPropertyValue(theme.accentVariables.l) + "%") : getComputedStyle(document.body).getPropertyValue(theme.accentVariables.l)})`)) }}
                                                        onClick={() => {
                                                            setAccentColor(getHex(`hsl(${getComputedStyle(document.body).getPropertyValue(theme.accentVariables.h)} ${!getComputedStyle(document.body).getPropertyValue(theme.accentVariables.s).includes("%") ? (getComputedStyle(document.body).getPropertyValue(theme.accentVariables.s) + "%") : getComputedStyle(document.body).getPropertyValue(theme.accentVariables.s)} ${!getComputedStyle(document.body).getPropertyValue(theme.accentVariables.l).includes("%") ? (getComputedStyle(document.body).getPropertyValue(theme.accentVariables.l) + "%") : getComputedStyle(document.body).getPropertyValue(theme.accentVariables.l)})`));
                                                        }}
                                                    >Accent</div>))}
                                    </div>
                                </div>
                            );
                        }
                    })}
                </ScrollerThin>
            </div>
        </ModalContent>
        <ModalFooter>
            <Button
                style={{ marginLeft: 8 }}
                color={Button.Colors.BRAND}
                size={Button.Sizes.MEDIUM}
                look={Button.Looks.FILLED}
                onClick={() => {
                    onFinished({
                        accent: accentColor,
                        primary: primaryColor,
                        secondary: secondaryColor,
                        tertiary: tertiaryColor
                    });
                    modalProps.onClose();
                }}
            >Finish</Button>
        </ModalFooter>
    </ModalRoot >;
}
