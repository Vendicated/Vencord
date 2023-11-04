import definePlugin from "@utils/types";

export default definePlugin({
    name: "AlwaysSuperReact",
    description: "Enables the Super React toggle by default.",
    authors: [
        {
            id: 145224646868860928n,
            name: "ant0n",
        },
    ],
    patches: [{
        find: ".hasAvailableBurstCurrency)",
        replacement: {
          match: /(?<=\.useBurstReactionsExperiment.{0,20})useState\(!1\)/,
          replace: "useState(true)"
        }
      }]
});