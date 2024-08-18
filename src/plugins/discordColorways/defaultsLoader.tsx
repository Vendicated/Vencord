import { DataStore } from ".";
import { defaultColorwaySource, nullColorwayObj } from "./constants";

export default async function () {
    const [
        customColorways,
        colorwaySourceFiles,
        showColorwaysButton,
        onDemandWays,
        onDemandWaysTintedText,
        onDemandWaysDiscordSaturation,
        onDemandWaysOsAccentColor,
        activeColorwayObject,
        colorwaysPluginTheme,
        colorwaysBoundManagers,
        colorwaysManagerAutoconnectPeriod,
        colorwaysManagerDoAutoconnect
    ] = await DataStore.getMany([
        "customColorways",
        "colorwaySourceFiles",
        "showColorwaysButton",
        "onDemandWays",
        "onDemandWaysTintedText",
        "onDemandWaysDiscordSaturation",
        "onDemandWaysOsAccentColor",
        "activeColorwayObject",
        "colorwaysPluginTheme",
        "colorwaysBoundManagers",
        "colorwaysManagerAutoconnectPeriod",
        "colorwaysManagerDoAutoconnect"
    ]);

    const defaults = [
        {
            name: "colorwaysManagerAutoconnectPeriod",
            value: colorwaysManagerAutoconnectPeriod,
            default: 3000
        },
        {
            name: "colorwaysManagerDoAutoconnect",
            value: colorwaysManagerDoAutoconnect,
            default: true
        },
        {
            name: "showColorwaysButton",
            value: showColorwaysButton,
            default: false
        },
        {
            name: "onDemandWays",
            value: onDemandWays,
            default: false
        },
        {
            name: "onDemandWaysTintedText",
            value: onDemandWaysTintedText,
            default: true
        },
        {
            name: "onDemandWaysDiscordSaturation",
            value: onDemandWaysDiscordSaturation,
            default: false
        },
        {
            name: "onDemandWaysOsAccentColor",
            value: onDemandWaysOsAccentColor,
            default: false
        },
        {
            name: "colorwaysBoundManagers",
            value: colorwaysBoundManagers,
            default: []
        },
        {
            name: "activeColorwayObject",
            value: activeColorwayObject,
            default: nullColorwayObj
        },
        {
            name: "colorwaysPluginTheme",
            value: colorwaysPluginTheme,
            default: "discord"
        }
    ];

    defaults.forEach(({ name, value, default: def }) => {
        if (!value) DataStore.set(name, def);
    });

    if (customColorways) {
        if (!customColorways[0].colorways) {
            DataStore.set("customColorways", [{ name: "Custom", colorways: customColorways }]);
        }
    } else {
        DataStore.set("customColorways", []);
    }

    if (colorwaySourceFiles) {
        if (typeof colorwaySourceFiles[0] === "string") {
            DataStore.set("colorwaySourceFiles", colorwaySourceFiles.map((sourceURL: string, i: number) => {
                return { name: sourceURL === defaultColorwaySource ? "Project Colorway" : `Source #${i}`, url: sourceURL === "https://raw.githubusercontent.com/DaBluLite/ProjectColorway/master/index.json" ? defaultColorwaySource : sourceURL };
            }));
        }
    } else {
        DataStore.set("colorwaySourceFiles", [{
            name: "Project Colorway",
            url: defaultColorwaySource
        }]);
    }

};
