import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
  name: "NoProfileEffect",
  description: "Hide profile effects",
  authors: [Devs.LonoxX],
  patches: [],

  start() {
    const style = document.createElement('style');
    style.innerHTML = `
            [class^="profileEffects_"], [class*=" profileEffects_"] { display: none !important; }
        `;
    document.head.appendChild(style);
  },

});
