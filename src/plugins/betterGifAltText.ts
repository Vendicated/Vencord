import definePlugin from "../utils/types";

export default definePlugin({
    name: "BetterGifAltText",
    author: "Vendicated",
    description:
        "Change GIF alt text from simply being 'GIF' to containing the gif tags / filename",
    patches: [
        {
            find: "onCloseImage=",
            replacement: {
                match: /(return .{1,2}\.createElement.{0,50}isWindowFocused)/,
                replace:
                    "Vencord.Plugins.plugins.BetterGifAltText.altify(e);$1",
            },
        },
        {
            find: 'preload:"none","aria',
            replacement: {
                match: /\?.{0,5}\.Messages\.GIF/,
                replace:
                    "?(e.alt='GIF',Vencord.Plugins.plugins.BetterGifAltText.altify(e))",
            },
        },
    ],

    altify(props: any) {
        if (props.alt !== "GIF") return;

        const url: string = props.original || props.src;
        let name = url
            .slice(url.lastIndexOf("/") + 1)
            .replace(/\d/g, "") // strip numbers
            .replace(/.gif$/, "") // strip extension
            .split(/[,\-_ ]+/g)
            .slice(0, 20)
            .join(" ");
        if (name.length > 300) {
            name = name.slice(0, 300) + "...";
        }

        if (name) props.alt += ` - ${name}`;

        return props.alt;
    },
});
