import Panel from "./lib/panel.js";
import {
  RGBPixel,
  getColor,
  Pixel,
  StaticPixel,
  PulsingPixel,
  FlashingPixel,
} from "./lib/launchpad.js";

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
        pnl.render();
      }, 10000);
    });
  }
}
let btn = panel.getButton(8, 0);
btn?.setDefaultPixelMaker((x, y) => new StaticPixel(x, y, getColor(0, 0, 3)));
btn?.onPressSuscribe((btn, pnl) => {
  pnl.renderFromPixels(2000, ...getPixels(image));
  setTimeout(() => {
    pnl.render();
  }, 1000);
  return true;
});

btn = panel.getButton(8, 8);
btn?.setDefaultPixelMaker(
  (x, y) => new PulsingPixel(x, y, getColor(3, 0, 0, true))
);

panel.render();
