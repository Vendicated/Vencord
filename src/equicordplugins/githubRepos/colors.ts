/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function getLanguageColor(language: string): string {
    const colors: Record<string, string> = {
        "JavaScript": "#f1e05a",
        "TypeScript": "#3178c6",
        "Python": "#3572A5",
        "Java": "#b07219",
        "C#": "#178600",
        "C++": "#f34b7d",
        "C": "#555555",
        "HTML": "#e34c26",
        "CSS": "#563d7c",
        "PHP": "#4F5D95",
        "Ruby": "#701516",
        "Go": "#00ADD8",
        "Rust": "#dea584",
        "Swift": "#ffac45",
        "Kotlin": "#A97BFF",
        "Dart": "#00B4AB",
        "Shell": "#89e051",
        "PowerShell": "#012456",
        "Lua": "#000080",
        "Perl": "#0298c3",
        "R": "#198CE7",
        "Scala": "#c22d40",
        "Haskell": "#5e5086",
        "Elixir": "#6e4a7e",
        "Clojure": "#db5855",
        "Vue": "#41b883",
        "Svelte": "#ff3e00",
        "Jupyter Notebook": "#DA5B0B",
        "Assembly": "#6E4C13",
        "COBOL": "#004B85",
        "CoffeeScript": "#244776",
        "Crystal": "#000100",
        "D": "#BA595E",
        "F#": "#B845FC",
        "Fortran": "#4d41b1",
        "GLSL": "#5686A5",
        "Groovy": "#e69f56",
        "Julia": "#a270ba",
        "Markdown": "#083fa1",
        "MATLAB": "#bb92ac",
        "Objective-C": "#438eff",
        "OCaml": "#3be133",
        "Pascal": "#E3F171",
        "Prolog": "#74283c",
        "PureScript": "#1D222D",
        "Racket": "#3c5caa",
        "Raku": "#0000fb",
        "Reason": "#ff5847",
        "SCSS": "#c6538c",
        "Solidity": "#AA6746",
        "Tcl": "#e4cc98",
        "Verilog": "#b2b7f8",
        "VHDL": "#adb2cb",
        "WebAssembly": "#04133b",
        "Zig": "#ec915c"
    };

    return colors[language] || "#858585";
}
