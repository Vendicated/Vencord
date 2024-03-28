export function goofs() {
    setTimeout(() => {
        (document.querySelector('[class^="wordmarkWindows"]')?.firstElementChild as any).style.display = "none";
        document.querySelector('[class^="wordmarkWindows"]')?.prepend(Object.assign(document.createElement("div"), {
            style: `height: 16px;
                        width: 51px;
                        color: var(--text-muted);
                        font-size: xx-small;
                        text-align: center;
                        margin-top: 5px;
                        font-weight: 600;
                        transform: scaleX(2.5);
                        letter-spacing: -1px;`,
            innerText: "Skype"
        }
        ));
        document.onmousedown = e => {
            const hit = Object.assign(document.createElement('div'), {
                style: `left: ${e.clientX}px;
                            top: ${e.clientY}px;
                            color: white;
                            text-align: center;
                            position: absolute;
                            z-index: 9999999;
                            pointer-events: none;
                            transform: translate(-50%, -50%);
                            font-size: 2rem;`,
                innerText: '×'
            });
            const hitSound = Object.assign(document.createElement('audio'), { src: 'https://cdn.discordapp.com/attachments/545600181744173068/1090841136458899516/hit.wav', autoplay: true, volume: 0.15 });
            hitSound.onended = () => {
                hit.removeChild(hitSound);
                document.body.removeChild(hit);
            };
            hit.appendChild(hitSound);
            document.body.appendChild(hit);
        };
    }, 1000);
}
