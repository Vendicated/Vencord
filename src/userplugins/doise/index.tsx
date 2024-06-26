// Import additional modules and components
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { enableStyle, disableStyle } from "@api/Styles";

// Import the CSS file
import style from "./index.css?managed";

const audioElement = document.createElement("audio");

const DOISE_URL = 'https://small.fileditchstuff.me/s12/fkEQaURpovijEHRvXtrd.mp3';

audioElement.src = DOISE_URL;

audioElement.volume = 0.5;

audioElement.loop = true;

function playmusic() {
    audioElement.currentTime = 0;
    audioElement.play();
}

function stopmusic() {
    audioElement.pause();
    audioElement.remove();
}


export default definePlugin({
    name: "Doise.",
    description: "Doise.",
    authors: [Devs.deimos],

    patches: [],

    start() {
        enableStyle(style);
        playmusic();
    },

    stop() {
        disableStyle(style);
        stopmusic();
    }
});