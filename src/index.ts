import Launchpad from "@launchpad/launchpad.js";
import type Pixel from "@launchpad/pixel.js";
import StaticPixel from "@launchpad/static_pixel.js";
import PulsingPixel from "@launchpad/pulsing_pixel.js";
import RGBPixel from "@launchpad/rgb_pixel.js";
import { getColor } from "@launchpad/utils.js";

const launchpad = await Launchpad.connect();
const image: Pixel[] = [];

launchpad.buttons.forEach((button, x, y) => {
  image.push(new RGBPixel(x, y, x * 5, ((x + y) / 2) * 5, y * 5));

  if (x <= 3 && y <= 3) {
    button.setDefaultPixelMaker(
      (column, row) => new RGBPixel(column, row, 40, 0, 63)
    );
    button.onPress((pressedButton) => {
      pressedButton.setFlashing(getColor(3, 0, 0), getColor(0, 0, 3));
      setTimeout(() => pressedButton.setDefaultPixel(), 10_000);
    });
  }
});

const playFrameButton = launchpad.buttons.at(8, 0);
playFrameButton?.setDefaultPixelMaker(
  (x, y) => new StaticPixel(x, y, getColor(0, 0, 3))
);
playFrameButton?.onPress((_button, source) => {
  source.enqueueFrame({ pixels: image, duration: 10_000 });
});

const clearFrameButton = launchpad.buttons.at(8, 1);
clearFrameButton?.setDefaultPixelMaker(
  (x, y) => new StaticPixel(x, y, getColor(3, 1, 0))
);
clearFrameButton?.onPress((_button, source) => source.clearFrames());

function logoHandler() {
  const button = launchpad.buttons.at(8, 8);
  let tick = 0;
  return () => {
    tick++;
    const rgb = tick % 3;
    button?.setDefaultPixelMaker(
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
