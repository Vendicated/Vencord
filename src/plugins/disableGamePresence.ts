import { definePluginSettings } from "@api/Settings"
import definePlugin, { OptionType } from "@utils/types";
import { Devs } from "@utils/constants";

const settings = definePluginSettings({
    executableNames: {
        description: "List of games to exclude by executable path (separate by comma)",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true,
    },

    gameTitles: {
        description: "List of games to exclude by game title (separate by comma).",
        type: OptionType.STRING,
        default: "",
        restartNeeded: true,
    }
})


export default definePlugin({
    name: "DisableGamePresence",
    description: "Allows you to exclude games from prescence by name or executable path.\nA full list of detectable games can be found here: https://discord.com/api/v9/applications/detectable",
    authors: [Devs.wally],
    patches: [
        {
            find: "If-None-Match",
            replacement: {
                match: /type:"GAMES_DATABASE_UPDATE",games:(\w),/,
                replace: "type:\"GAMES_DATABASE_UPDATE\",games:$self.filterGames($1),"
            }
        }
    ],
    settings,

    filterGames(games) {
        var gameTitles = settings.store.gameTitles.split(",");
        var gameExecutables = settings.store.gameTitles.split(",");

        games = games.filter(function(game) {
            if (gameTitles.includes(game.name)) {
                return false
            }

            if (game.executables.find((executable) => gameExecutables.includes(executable.name))) {
                return false
            }

            return true
        })

        return games
    },
});