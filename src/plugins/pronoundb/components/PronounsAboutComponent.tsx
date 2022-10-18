import { Forms, React } from "../../../webpack/common";

export default function () {
    return (
        <React.Fragment>
            <Forms.FormTitle tag="h3">More Information</Forms.FormTitle>
            <Forms.FormText>
                The two pronoun formats are lowercase and capitalized. Example:
                <ul>
                    <li>Lowercase: they/them</li>
                    <li>Capitalized: They/Them</li>
                </ul>
                Test like "Ask me my pronouns" or "Any pronouns" will always be capitalized. <br /><br />
                You can also configure whether or not to display pronouns for the current user (since you probably already know them)
            </Forms.FormText>
        </React.Fragment>
    );
}
