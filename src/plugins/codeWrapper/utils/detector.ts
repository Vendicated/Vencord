export function isAlreadyCodeBlock(content: string): boolean {
    const trimmed = content.trim();
    return /^`{3}[\s\S]*`{3}$/m.test(trimmed);
}

export function wrapWithCodeBlock(content: string, language: string): string {
    const backticks = content.match(/`+/g);
    let maxLength = 0;

    if (backticks) {
        maxLength = Math.max(...backticks.map(t => t.length));
    }

    const fenceLength = Math.max(3, maxLength + 1);
    const fence = "`".repeat(fenceLength);

    return `${fence}${language}\n${content.trim()}\n${fence}`;
}
