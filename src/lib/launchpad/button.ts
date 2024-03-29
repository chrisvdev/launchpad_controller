import StaticPixel from "@launchpad/static_pixel.js";
import PulsingPixel from "@launchpad/pulsing_pixel.js";
import FlashingPixel from "@launchpad/flashing_pixel.js";
import RGBPixel from "@launchpad/rgb_pixel.js";
import { getColor } from "@launchpad/utils.js";
import type Pixel from "@launchpad/pixel.js";
import {
  AxisCoordinate,
  ButtonEventListener,
  Coordinate,
  DefaultPixelMaker,
  MIDIData,
  PalletCode,
  PalletPrimaryColor,
} from "@launchpad/types.js";
import type Panel from "@launchpad/panel.js";

export default class Button {
  #x;
  #y;
  #panel;
  #defaultPixelMaker: DefaultPixelMaker = (x, y) => new RGBPixel(x, y, 2, 2, 2);
  #pixel: Pixel = new StaticPixel(0, 0, 0);
  #onPressCB: ButtonEventListener = (btn, panel) => {
    btn.setPulsing(getColor(3, 0, 0));
    console.log(`Pressed not defined: ${this.#y + 1}${this.#x + 1}`);
    setTimeout(() => {
      btn.setDefaultPixel();
    }, 2000);
  };
  #onLeaveCB: ButtonEventListener = (btn) => {
    console.log(`Leaved not defined: ${this.#y + 1}${this.#x + 1}`);
  };
  constructor(x: AxisCoordinate, y: AxisCoordinate, panel: Panel) {
    this.#x = x;
    this.#y = y;
    this.#panel = panel;
    this.setDefaultPixel();
  }
  onPressSuscribe(cb: ButtonEventListener) {
    this.#onPressCB = cb;
  }
  onPress(msg: MIDIData) {
    this.#onPressCB(this, this.#panel, msg);
  }
  onLeaveSuscribe(cb: ButtonEventListener) {
    this.#onLeaveCB = cb;
  }
  onLeave(msg: MIDIData) {
    this.#onLeaveCB(this, this.#panel, msg);
  }
  setStatic(code: PalletCode = 0) {
    this.#pixel = new StaticPixel(this.#x, this.#y, code);
    this.renderPixel();
  }
  setFlashing(code: PalletCode = 0, code2: PalletCode = 0) {
    this.#pixel = new FlashingPixel(this.#x, this.#y, code, code2);
    this.renderPixel();
  }
  setPulsing(code: PalletCode = 0) {
    this.#pixel = new PulsingPixel(this.#x, this.#y, code);
    this.renderPixel();
  }
  setRGB(r: PalletPrimaryColor, g: PalletPrimaryColor, b: PalletPrimaryColor) {
    this.#pixel = new RGBPixel(this.#x, this.#y, r, g, b);
    this.renderPixel();
  }
  setDefaultPixel() {
    const pixel = this.#defaultPixelMaker(this.#x, this.#y);
    this.#pixel = pixel;
    this.renderPixel();
    return pixel;
  }
  setDefaultPixelMaker(maker: DefaultPixelMaker) {
    this.#defaultPixelMaker = maker;
    this.setDefaultPixel();
  }
  getPixel() {
    return this.#pixel;
  }
  renderPixel() {
    this.#panel.renderFromPixels(this.#pixel);
  }
  getCoordinate() {
    return {
      x: this.#x,
      y: this.#y,
    } as Coordinate;
  }
}
