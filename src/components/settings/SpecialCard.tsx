/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./SpecialCard.css";

import { classNameFactory } from "@api/Styles";
import { Card } from "@components/Card";
import { Divider } from "@components/Divider";
import { Clickable, Forms } from "@webpack/common";
import type { PropsWithChildren } from "react";

const cl = classNameFactory("vc-special-");

interface StyledCardProps {
    title: string;
    subtitle?: string;
    description: string;
    cardImage?: string;
    backgroundImage?: string;
    backgroundColor?: string;
    buttonTitle?: string;
    buttonOnClick?: () => void;
}

export function SpecialCard({ title, subtitle, description, cardImage, backgroundImage, backgroundColor, buttonTitle, buttonOnClick: onClick, children }: PropsWithChildren<StyledCardProps>) {
    const cardStyle: React.CSSProperties = {
        backgroundColor: backgroundColor || "#9c85ef",
        backgroundImage: `url(${backgroundImage || ""})`,
    };

    return (
        <Card className={cl("card", "card-special")} style={cardStyle}>
            <div className={cl("card-flex")}>
                <div className={cl("card-flex-main")}>
                    <Forms.FormTitle className={cl("title")} tag="h5">{title}</Forms.FormTitle>
                    <Forms.FormText className={cl("subtitle")}>{subtitle}</Forms.FormText>
                    <Forms.FormText className={cl("text")}>{description}</Forms.FormText>

                    {children}
                </div>
                {cardImage && (
                    <div className={cl("image-container")}>
                        <img
                            role="presentation"
                            src={cardImage}
                            alt=""
                            className={cl("image")}
                        />
                    </div>
                )}
            </div>
            {buttonTitle && (
                <>
                    <Divider className={cl("seperator")} />
                    <Clickable onClick={onClick} className={cl("hyperlink")}>
                        <Forms.FormText className={cl("hyperlink-text")}>
                            {buttonTitle}
                        </Forms.FormText>
                    </Clickable>
                </>
            )}
        </Card>
    );
}
