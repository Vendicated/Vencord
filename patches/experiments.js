module.exports = {
    name: "Experiments",
    patches: [{
        find: "Object.defineProperties(this,{isDeveloper",
        replacement: {
            match: /(?<={isDeveloper:\{[^}]+,get:function\(\)\{return )\w/,
            replace: "true"
        }
    }]
};
