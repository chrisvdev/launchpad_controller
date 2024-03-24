import Pixel from "./pixel.js";
import {
  AxisCoordinate,
  Coordinate,
  RGBPrimaryColor,
  SysexData,
} from "@launchpad/types.js";
import { getPosition } from "@launchpad/utils.js";

export default class RGBPixel implements Pixel {
  #x;
  #y;
  #red;
  #green;
  #blue;
  constructor(
    x: AxisCoordinate,
    y: AxisCoordinate,
    red: RGBPrimaryColor = 0,
    green: RGBPrimaryColor = 0,
    blue: RGBPrimaryColor = 0
  ) {
    this.#x = x;
    this.#y = y;
    this.#red = red;
    this.#green = green;
    this.#blue = blue;
  }
  getSysexMessage() {
    return [
      3,
      getPosition(this.#x, this.#y),
      this.#red,
      this.#green,
      this.#blue,
    ] as SysexData;
  }
  getPosition() {
    return {
      x: this.#x,
      y: this.#y,
    } as Coordinate;
  }
}
