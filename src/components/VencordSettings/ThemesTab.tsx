/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { useSettings } from "@api/settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Link } from "@components/Link";
import { Margins } from "@utils/margins";
import { useAwaiter } from "@utils/misc";
import { findLazy } from "@webpack";
import { Card, Forms, React, TextArea } from "@webpack/common";

const TextAreaProps = findLazy(m => typeof m.textarea === "string");

function Validator({ link }: { link: string; }) {
    const [res, err, pending] = useAwaiter(() => fetch(link).then(res => {
        if (res.status > 300) throw `${res.status} ${res.statusText}`;
        const contentType = res.headers.get("Content-Type");
        if (!contentType?.startsWith("text/css") && !contentType?.startsWith("text/plain"))
            throw "Not a CSS file. Remember to use the raw link!";

        return "Okay!";
    }));

    const text = pending
        ? "Checking..."
        : err
            ? `Error: ${err instanceof Error ? err.message : String(err)}`
            : "Valid!";

    return <Forms.FormText style={{
        color: pending ? "var(--text-muted)" : err ? "var(--text-danger)" : "var(--text-positive)"
    }}>{text}</Forms.FormText>;
}

function Validators({ themeLinks }: { themeLinks: string[]; }) {
    if (!themeLinks.length) return null;

    return (
        <>
            <Forms.FormTitle className={Margins.top20} tag="h5">Validator</Forms.FormTitle>
            <Forms.FormText>This section will tell you whether your themes can successfully be loaded</Forms.FormText>
            <div>
                {themeLinks.map(link => (
                    <Card style={{
                        padding: ".5em",
                        marginBottom: ".5em",
                        marginTop: ".5em"
                    }} key={link}>
                        <Forms.FormTitle tag="h5" style={{
                            overflowWrap: "break-word"
                        }}>
                            {link}
                        </Forms.FormTitle>
                        <Validator link={link} />
                    </Card>
                ))}
            </div>
        </>
    );
}

export default ErrorBoundary.wrap(function () {
    const settings = useSettings();
    const [themeText, setThemeText] = React.useState(settings.themeLinks.join("\n"));

    function onBlur() {
        settings.themeLinks = [...new Set(
            themeText
                .trim()
                .split(/\n+/)
                .map(s => s.trim())
                .filter(Boolean)
        )];
    }

    return (
        <>
            <Card className="vc-settings-card vc-text-selectable">
                <Forms.FormTitle tag="h5">Paste links to .css / .theme.css files here</Forms.FormTitle>
                <Forms.FormText>One link per line</Forms.FormText>
                <Forms.FormText>Make sure to use the raw links or github.io links!</Forms.FormText>
                <Forms.FormDivider className={Margins.top8 + " " + Margins.bottom8} />
                <Forms.FormTitle tag="h5">Find Themes:</Forms.FormTitle>
                <div style={{ marginBottom: ".5em" }}>
                    <Link style={{ marginRight: ".5em" }} href="https://betterdiscord.app/themes">
                        BetterDiscord Themes
                    </Link>
                    <Link href="https://github.com/search?q=discord+theme">GitHub</Link>
                </div>
                <Forms.FormText>If using the BD site, click on "Source" somewhere below the Download button</Forms.FormText>
                <Forms.FormText>In the GitHub repository of your theme, find X.theme.css / X.css, click on it, then click the "Raw" button</Forms.FormText>
                <Forms.FormText>
                    If the theme has configuration that requires you to edit the file:
                    <ul>
                        <li>• Make a <Link href="https://github.com/signup">GitHub</Link> account</li>
                        <li>• Click the fork button on the top right</li>
                        <li>• Edit the file</li>
                        <li>• Use the link to your own repository instead</li>
                    </ul>
                </Forms.FormText>
            </Card>
            <Forms.FormTitle tag="h5">Themes</Forms.FormTitle>
            <TextArea
                value={themeText}
                onChange={setThemeText}
                className={`${TextAreaProps.textarea} vc-settings-theme-links`}
                placeholder="Theme Links"
                spellCheck={false}
                onBlur={onBlur}
            />
            <Validators themeLinks={settings.themeLinks} />
        </>
    );
});
