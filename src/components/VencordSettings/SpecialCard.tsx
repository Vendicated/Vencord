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

import "./specialCard.css";

import { classNameFactory } from "@api/Styles";
import { Card, Clickable, Forms, React } from "@webpack/common";
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
                    <Forms.FormDivider className={cl("seperator")} />
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
