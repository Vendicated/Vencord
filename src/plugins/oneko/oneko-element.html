<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>oneko-element.js</title>
  </head>
  <body style="height: 5000px; background-color: #03050c; color: #fcfcfc">
    <script src="./oneko-element.js?define" type="module"></script>

    <details open style="padding: 200px">
      <o-neko
        id="$bigNeko"
        speed="15"
        style="position: absolute; filter: invert(100%); transform: scale(2)"
      ></o-neko>
    </details>

    <o-neko
      y="200"
      x="200"
      speed="11"
      id="$smallNeko"
      style="filter: invert(0.25) sepia(1) hue-rotate(0.7turn)"
    ></o-neko>

    <script src="./oneko.js"></script>

    <script>
      // localStorage.removeItem("$smallNeko");

      // for (let i = 0; i < 3; i++) {
      //   const neko = document.createElement("o-neko");
      //   neko.setAttribute('x', Math.random() * window.innerWidth)
      //   neko.setAttribute('y', Math.random() * window.innerHeight)
      //   neko.setAttribute('speed', (Math.random() * 14) + 6)
      //   neko.style.transform = `scale(${(Math.random() + 1) * Math.random() + 0.5})`
      //   neko.style.filter = `invert(${(Math.random()) * 2}) sepia(${Math.random() * 2}) saturate(${Math.random() * 10}) hue-rotate(${Math.random()}turn)`
      //   // neko.style.willChange = 'left, top, background-position, transform'
      //   document.body.append(neko)
      // }

      const nekoList = [
        { $neko: $smallNeko, name: "$smallNeko" },
        { $neko: $bigNeko, name: "$bigNeko" },
      ];

      window.onload = () => {
        nekoList.forEach(({ $neko, name }) => {
          const data = JSON.parse(localStorage.getItem(name));
          Object.assign($neko.neko, data);
          Object.assign($neko.goto, data);
          $neko.updatePosition();
        });

        window.onbeforeunload = () => {
          nekoList.forEach(({ $neko, name }) => {
            const data = { x: $neko.neko.x, y: $neko.neko.y };
            localStorage.setItem(name, JSON.stringify(data));
          });
        };
      };
    </script>
  </body>
</html>
