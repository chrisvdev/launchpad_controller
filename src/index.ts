import Panel from "@launchpad/panel.js";
import type Pixel from "@launchpad/pixel.js";
import StaticPixel from "@launchpad/static_pixel.js";
import PulsingPixel from "@launchpad/pulsing_pixel.js";
import FlashingPixel from "@launchpad/flashing_pixel.js";
import RGBPixel from "@launchpad/rgb_pixel.js";
import { getColor } from "@launchpad/utils.js";

const panel = new Panel();

type Image = Pixel[][];

const image: Image = [];
for (let x = 0; x <= 8; x++) {
  image[x] = [];
  for (let y = 0; y <= 8; y++) {
    // @ts-ignore
    image[x][y] = new RGBPixel(
      x,
      y,
      x * 5,
      ((x, y) => {
        const co = (x + y) / 2;
        return co * 5;
      })(x, y),
      y * 5
    );
  }
}

function getPixels(image: Image) {
  const pixels: Pixel[] = [];
  for (let x = 0; x <= 8; x++) {
    for (let y = 0; y <= 8; y++) {
      // @ts-ignore
      pixels.push(image[x][y]);
    }
  }
  return pixels;
}

for (let x = 0; x <= 3; x++) {
  for (let y = 0; y <= 3; y++) {
    const btn = panel.getButton(x, y);
    btn?.setDefaultPixelMaker((x, y) => new RGBPixel(x, y, 40, 0, 63));
    btn?.setDefaultPixel();
    // @ts-ignore
    btn.onPressSuscribe((btn, pnl) => {
      const { x, y } = btn.getCoordinate();

      btn.setFlashing(getColor(3, 0, 0), getColor(0, 0, 3));
      setTimeout(() => {
        btn.setDefaultPixel();
      }, 10000);
    });
  }
}
let btn = panel.getButton(8, 0);
btn?.setDefaultPixelMaker((x, y) => new StaticPixel(x, y, getColor(0, 0, 3)));
btn?.onPressSuscribe((btn, pnl) => {
  pnl.addFrameToRender({ pixels: getPixels(image), TTL: 10000 });
  return true;
});
btn = panel.getButton(8, 1);
btn?.setDefaultPixelMaker((x, y) => new StaticPixel(x, y, getColor(3, 1, 0)));
btn?.onPressSuscribe((btn, pnl) => {
  pnl.clearFramesToRender();
  return true;
});

function logoHandler() {
  const btn = panel.getButton(8, 8);
  let tick = 0;
  return () => {
    tick++;
    const rgb = tick % 3;
    btn?.setDefaultPixelMaker(
      (x, y) =>
        new PulsingPixel(
          x,
          y,
          getColor(
            rgb === 0 ? 3 : 0,
            rgb === 1 ? 2 : 0,
            rgb === 2 ? 3 : 0,
            true
          )
        )
    );
  };
}

setInterval(logoHandler(), 1000);
