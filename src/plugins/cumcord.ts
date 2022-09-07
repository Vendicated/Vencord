import definePlugin from "../utils/types";

export default definePlugin({
  name: "cumcord",
  description: "Loads cumcord. That's it",
  author: "Vendicated",
  async start() {
    const cum = await fetch("https://raw.githubusercontent.com/Cumcord/Cumcord/stable/dist/build.js");
    (0, eval)(await cum.text());
  },
  stop() {
    window.cumcord?.uninject();
  },
});
