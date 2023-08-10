/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Link } from "@components/Link";
import { Forms, React } from "@webpack/common";

export default function PronounsAboutComponent() {
    return (
        <React.Fragment>
            <Forms.FormTitle tag="h3">More Information</Forms.FormTitle>
            <Forms.FormText>To add your own pronouns, visit{" "}
                <Link href="https://pronoundb.org">pronoundb.org</Link>
            </Forms.FormText>
            <Forms.FormDivider />
            <Forms.FormText>
                The two pronoun formats are lowercase and capitalized. Example:
                <ul>
                    <li>Lowercase: they/them</li>
                    <li>Capitalized: They/Them</li>
                </ul>
                Text like "Ask me my pronouns" or "Any pronouns" will always be capitalized. <br /><br />
                You can also configure whether or not to display pronouns for the current user (since you probably already know them)
            </Forms.FormText>
        </React.Fragment>
    );
}
