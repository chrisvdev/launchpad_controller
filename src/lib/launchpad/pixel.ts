import { Coordinate, SysexData } from "@launchpad/types.js";

export default interface Pixel {
  getSysexMessage(): SysexData;
  getPosition(): Coordinate;
}
