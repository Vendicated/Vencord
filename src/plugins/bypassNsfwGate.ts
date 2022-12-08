import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
  name: "Bypass NSFW Gate",
  description: "Allows you to access NSFW channels even if you are not 18 years old",
  authors: [Devs.Commandtechno],

  start() {
    Vencord.Webpack.Common.UserStore.getCurrentUser().nsfwAllowed = true;
  },

  stop() {
    Vencord.Webpack.Common.UserStore.getCurrentUser().nsfwAllowed = false;
  },
});
