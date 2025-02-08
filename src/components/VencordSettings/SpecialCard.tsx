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
    backgroundGradient?: string;
}

export function SpecialCard({ title, description, cardImage, backgroundImage, backgroundGradient, children }: PropsWithChildren<StyledCardProps>) {
    const cardStyle: React.CSSProperties = {
        background: `url(${backgroundImage || ""})${backgroundGradient ? `, ${backgroundGradient}` : ""}`,
    };

    return (
        <Card className={cl("card", "card-special")} style={cardStyle}>
            <div className={cl("card-flex")}>
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
                <div className={cl("card-flex-main")}>
                    <Forms.FormTitle className={cl("title")} tag="h5">{title}</Forms.FormTitle>
                    <Forms.FormText className={cl("text")}>{description}</Forms.FormText>

                    {children}
                </div>
            </div>
        </Card>
    );
}
