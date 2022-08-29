document.addEventListener("DOMContentLoaded", async () => {
    const style = document.createElement("style");
    document.head.appendChild(style);
    VencordNative.handleQuickCssUpdate((css: string) => style.innerText = css);
    style.innerText = await VencordNative.getQuickCss();
});