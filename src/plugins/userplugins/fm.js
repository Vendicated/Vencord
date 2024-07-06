//META{"name":"ExampleLibraryPlugin", "authorId":"575933571186032641", "invite":"TQ2dePQ", "website":"https://github.com/ali0sam"}*//
//import {DiscordModules as Modules} from "modules";
class ExampleLibraryPlugin {
    
    getName() {return "Fake Mute&Deafen";}
    getDescription() {return "Join voice channel, mute and deafen yourself, start and stop plugin, now you can Un-mute and Listen and speak!";}
    getVersion() {return "0.0.1";}
    getAuthor() {return "ali_s";}
    



    start() {
        if (!global.ZeresPluginLibrary) return window.BdApi.alert("Library Missing",`The library plugin needed for ${this.getName()} is missing.<br /><br /> <a href="https://betterdiscord.net/ghdl?url=https://raw.githubusercontent.com/rauenzi/BDPluginLibrary/master/release/0PluginLibrary.plugin.js" target="_blank">Click here to download the library!</a>`);
        ZLibrary.PluginUpdater.checkForUpdate(this.getName(), this.getVersion(), "LINK_TO_RAW_CODE");
        
        var text = new TextDecoder("utf-8");

WebSocket.prototype.original = WebSocket.prototype.send;
WebSocket.prototype.send = function(data) {
    if (Object.prototype.toString.call(data) === "[object ArrayBuffer]") {
        if (text.decode(data).includes("self_deaf")) {
            console.log("found mute/deafen");
            data = data.replace('"self_mute":false', 'NiceOneDiscord');
            console.log("Activated");
        }
    }
    WebSocket.prototype.original.apply(this, [data]);
}
window.BdApi.alert("success",`now you can stop plugin!, After you turned ON the plugin , you cant join any other voice channels , for this you have to Reload discord!`);

    }



    stop() {

    }
}
