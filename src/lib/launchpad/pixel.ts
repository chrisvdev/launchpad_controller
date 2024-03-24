import { Coordinate, SysexData } from "./types.js";

export default interface Pixel {
  getSysexMessage(): SysexData;
  getPosition(): Coordinate;
}
