import { SettingsTab, wrapTab } from "@components/VencordSettings/shared";
import { Button, Card, Forms, Text, TextInput } from "@webpack/common";
import { Margins } from "@utils/margins";
import { classNameFactory } from "@api/Styles";
import { React } from "@webpack/common";
import { useSettings } from "@api/Settings";


const cl = classNameFactory("vc-addon-");
const clS = classNameFactory("vc-settings-theme-");

const reg = /<a [^=]*="[^"]*" href="(?<originalUrl>[^"]*)">\s{5}<[^>]*>\s{9}<img [^=]*="[^"]*" [^=]*="[^"]*" [^=]*="[^"]*" src="(?<image>[^"]*)" [^=]*="[^"]*" [^=]*="[^"]*" \/>\s{9}<[^>]*>\s{13}<[^>]*>(?<name>[^<]*)<[^>]*>\s{13}<[^>]*>[^<]*<[^>]*><a [^=]*="[^"]*"[^=]*="[^"]*"[^=]*="(?<authorUrl>[^"]*)">(?<author>[^<]*)<[^>]*><[^>]*><[^>]*>\s{13}<[^>]*>(?<description>[^<]*)<[^>]*>\s{13}<[^>]*>(?<tags>([\s\S](?!\/div>))*)<[^>]*>\s{13}<[^>]*>\s{17}<[^>]*>\s{21}<a href="(?<download>[^"]*)" [^=]*="[^"]*">\s*<[^>]*>\s*<[^>]*><[^>]*>\s*<[^>]*>\s*<[^>]*>[^<]*<[^>]*>\s*<[^>]*>\s*<[^>]*>\s*<[^>]*>\s*<[^>]*>\s*<[^>]*>\s*<[^>]*>\s*<[^>]*>\s*<[^>]*>\s*<[^>]*>(?<installs>[^<]*)<[^>]*>\s*<[^>]*>\s*<[^>]*>\s*<[^>]*>\s*<[^>]*>\s*<[^>]*>\s*<[^>]*>\s*<[^>]*>(?<likes>[^<]*)<[^>]*>\s*<[^>]*>\s*<[^>]*>\s*<[^>]*>\s*<[^>]*>\s*<[^>]*>\s*<[^>]*>/;
const tagsReg = /<span [^>]*>\s*([^\n]*)\s*<\/span>/;

const apiRequestUrl = "https://raw.githubusercontent.com/CREAsTIVE/BetterDiscordThemesCloner/master/themes.json";

//https://faktologia.com/wp-content/uploads/2020/10/placeholder-1.png
function renderTheme(theme) {
    return (
        <div className={cl("card")} onClick={() => { }} style={{
            display: "flex",
            flexDirection: "column",
        }}>
            <Text variant="text-md/bold" className={clS("name")}>
                {theme.name}
            </Text>
            <Text variant="text-md/normal" className={clS("author")}>
                {theme.author.display_name}
            </Text>

            <img src={theme.thumbnail_url === null ? `https://faktologia.com/wp-content/uploads/2020/10/placeholder-1.png` : `https://betterdiscord.app${theme.thumbnail_url}`} alt="Preview" loading="lazy" style={{
                width: "100%",
                borderRadius: "0.5em",
                margin: "auto",
                marginBottom: "0.5em",
            }} />
            <div style={{
                display: "flex",
                flexDirection: "row",
                marginBottom: "0",
                marginTop: "auto",
            }}>
                <div style={{
                    display: "flex",
                    flexDirection: "row",
                    marginRight: "auto",
                    gap: "0.5em"
                }}>
                    <Button
                        size={Button.Sizes.TINY}
                        onClick={() => {
                            settings.themeLinks = [theme.latest_source_url.replace("github.com", "raw.githubusercontent.com").replace("blob/", "")];
                            settings.enabledThemes = [];
                        }}
                    >
                        Load
                    </Button>
                    {/* <Button
                        size={Button.Sizes.TINY}
                        onClick={async () => {
                            var themesDir: string = await VencordNative.themes.getThemesDir();
                        }}
                    >
                        Download</Button> */}
                </div>
                <div style={{
                    display: "flex",
                    flexDirection: "row",
                    marginLeft: "auto",
                    alignItems: "center"
                }}>
                    <Text style={{
                        fontSize: "1em",
                        marginRight: "0.15em"
                    }}>{theme.downloads}</Text>
                    <svg fill="#b3b3b3" width="1.5em" height="1.5em" viewBox="-5.25 -5.25 45.50 45.50" data-name="Layer 2" id="bdd05811-e15d-428c-bb53-8661459f9307" xmlns="http://www.w3.org/2000/svg" stroke="#b3b3b3" stroke-width="2.73"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M17.5,22.131a1.249,1.249,0,0,1-1.25-1.25V2.187a1.25,1.25,0,0,1,2.5,0V20.881A1.25,1.25,0,0,1,17.5,22.131Z"></path><path d="M17.5,22.693a3.189,3.189,0,0,1-2.262-.936L8.487,15.006a1.249,1.249,0,0,1,1.767-1.767l6.751,6.751a.7.7,0,0,0,.99,0l6.751-6.751a1.25,1.25,0,0,1,1.768,1.767l-6.752,6.751A3.191,3.191,0,0,1,17.5,22.693Z"></path><path d="M31.436,34.063H3.564A3.318,3.318,0,0,1,.25,30.749V22.011a1.25,1.25,0,0,1,2.5,0v8.738a.815.815,0,0,0,.814.814H31.436a.815.815,0,0,0,.814-.814V22.011a1.25,1.25,0,1,1,2.5,0v8.738A3.318,3.318,0,0,1,31.436,34.063Z"></path></g></svg>
                    <Text style={{
                        marginLeft: "0.7em",
                        fontSize: "1em",
                        marginRight: "0.15em"
                    }}>{theme.likes}</Text>
                    <svg fill="#b3b3b3" height="1.5em" width="1.5em" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="-5.2 -5.2 62.40 62.40" xmlSpace="preserve" stroke="#b3b3b3" stroke-width="3.9517719999999996" transform="rotate(0)matrix(-1, 0, 0, 1, 0, 0)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <path d="M51.911,16.242C51.152,7.888,45.239,1.827,37.839,1.827c-4.93,0-9.444,2.653-11.984,6.905 c-2.517-4.307-6.846-6.906-11.697-6.906c-7.399,0-13.313,6.061-14.071,14.415c-0.06,0.369-0.306,2.311,0.442,5.478 c1.078,4.568,3.568,8.723,7.199,12.013l18.115,16.439l18.426-16.438c3.631-3.291,6.121-7.445,7.199-12.014 C52.216,18.553,51.97,16.611,51.911,16.242z M49.521,21.261c-0.984,4.172-3.265,7.973-6.59,10.985L25.855,47.481L9.072,32.25 c-3.331-3.018-5.611-6.818-6.596-10.99c-0.708-2.997-0.417-4.69-0.416-4.701l0.015-0.101C2.725,9.139,7.806,3.826,14.158,3.826 c4.687,0,8.813,2.88,10.771,7.515l0.921,2.183l0.921-2.183c1.927-4.564,6.271-7.514,11.069-7.514 c6.351,0,11.433,5.313,12.096,12.727C49.938,16.57,50.229,18.264,49.521,21.261z"></path> </g> </g></svg>
                </div>

            </div>
        </div>
    );
}

function renderThemes(themes) {
    return (
        <div className={clS("grid")}>
            {themes.map((e) => renderTheme(e))}
        </div>
    );
}
function fetchThemes() {
    fetch(apiRequestUrl).then((data) => data.json())
        .then((json) => {
            themes = json.sort((a, b) => b.likes - a.likes);
            filteredThemesSetter(themes);
        })
        .catch((e) => { });
}

var themes: Array<any> = [];
var filteredThemes: any = [];
var filteredThemesSetter;
var settings: any;
var searchValue: { str: string; }; // todo: add search by date, etc
var searchValueSetter: React.Dispatch<React.SetStateAction<{ str: string; }>>;
var isFetched: boolean = false;

function onSearch(newStr) {
    searchValueSetter({ str: newStr });

    filteredThemesSetter(newStr === "" ? themes : themes.filter((e) => -1 !== e.name.toLowerCase().indexOf(newStr.toLowerCase())));
}

function BetterDiscordThemesTab() {
    [filteredThemes, filteredThemesSetter] = React.useState([]);
    [searchValue, searchValueSetter] = React.useState({ str: "" });
    settings = useSettings(["themeLinks", "enabledThemes"]);
    if (!isFetched) {
        isFetched = true;
        fetchThemes();
    } else if (searchValue.str === "") {
        filteredThemes = themes;
    }
    return (
        <SettingsTab title="BetterDiscord Themes">
            <TextInput autoFocus value={searchValue.str} placeholder="Search for a theme..." onChange={onSearch} className={Margins.bottom20} />
            {filteredThemes.length === 0 ? <Text>Can't find any theme with this name...</Text> : renderThemes(filteredThemes)}
        </SettingsTab>
    );
}

export default wrapTab(BetterDiscordThemesTab, "BetterDiscord Themes");