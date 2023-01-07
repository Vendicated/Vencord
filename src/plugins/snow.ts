import definePlugin from "../utils/types";
import { Devs } from "../utils/constants";

export default definePlugin({
  // This is the name of the plugin
  name: "Snow",
  // This is the authors of the plugin
  authors: [
    Devs.Samomen
  ],
  // This is the description of the plugin
  description: "Your client will have excellent snow",
  // This is the dependencies of the plugin

  // This is the start function of the plugin
  start() {
    function embRand(min: number, max: number): number {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    // Create the snow effect
    function createSnowEffect(): void {
      const container = document.createElement('div');
      container.id = 'embedim--snow';
      container.style.position = 'fixed';
      container.style.left = '0';
      container.style.top = '0';
      container.style.bottom = '0';
      container.style.width = '100vw';
      container.style.height = '100vh';
      container.style.overflow = 'hidden';
      container.style.zIndex = '9999999';
      container.style.pointerEvents = 'none';

      const styles = document.createElement('style');
      styles.innerHTML = `
              .embedim-snow {
                position: absolute;
                width: 10px;
                height: 10px;
                background: white;
                border-radius: 50%;
                margin-top: -10px;
              }
            `;

      const snowflakes: HTMLElement[] = [];
      for (let i = 0; i < 200; i++) {
        const snowflake = document.createElement('i');
        snowflake.classList.add('embedim-snow');
        snowflake.style.opacity = (embRand(1, 10000) * 0.0001).toFixed(2);

        const rndX = (embRand(0, 1000000) * 0.0001).toFixed(2);
        const rndO = (embRand(-100000, 100000) * 0.0001).toFixed(2);
        const rndT = (embRand(3, 8) * 10).toFixed(2);
        const rndS = (embRand(0, 10000) * 0.0001).toFixed(2);

        snowflake.style.transform = `translate(${rndX}vw, -10px) scale(${rndS})`;
        snowflake.style.animation = `fall-${i} ${embRand(10, 30)}s -${embRand(0, 30)}s linear infinite`;

        styles.innerHTML += `
                @keyframes fall-${i} {
                  ${rndT}% {
                    transform: translate(${(rndX + rndO)}vw, ${rndT}vh) scale(${rndS});
                  }
                  to {
                    transform: translate(${(rndX + (parseInt(rndO) / 2))}vw, 105vh) scale(${rndS});
                  }
                }
              `;

        snowflakes.push(snowflake);
      }

      container.appendChild(styles);
      snowflakes.forEach(flake => container.appendChild(flake));
      document.body.appendChild(container);
    }
    const snowContainer = document.getElementById('embedim--snow');
    if (!snowContainer) {
      createSnowEffect();
    }
  },
  // This is the stop function of the plugin
  stop() {
    const snowContainer = document.getElementById('embedim--snow');
    if (snowContainer) {
      snowContainer.remove();
    }
  }
});