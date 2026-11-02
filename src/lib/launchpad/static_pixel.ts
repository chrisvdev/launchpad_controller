import Pixel from "./pixel.js";
import {
  AxisCoordinate,
  Coordinate,
  SysexData,
  PalletCode,
} from "@launchpad/types.js";
import { getPosition } from "@launchpad/utils.js";

/**
 * Un LED fijo que usa un índice de la paleta del Launchpad. Su carga útil de
 * color LED directo es `[0, position, paletteCode]`.
 */
export default class StaticPixel implements Pixel {
  #x;
  #y;
  #code;

  /**
    * @param x - Columna del LED basada en cero.
    * @param y - Fila del LED basada en cero.
    * @param code - Índice de paleta del Launchpad.
   */
  constructor(x: AxisCoordinate, y: AxisCoordinate, code: PalletCode = 0) {
    this.#x = x;
    this.#y = y;
    this.#code = code;
  }

  /**
    * Serializa este LED fijo como un segmento de píxel de color LED directo.
   */
  getSysexMessage() {
    return [0, getPosition(this.#x, this.#y), this.#code] as SysexData;
  }

  /**
    * Devuelve la coordenada basada en cero representada por este píxel.
   */
  getPosition() {
    return {
      x: this.#x,
      y: this.#y,
    } as Coordinate;
  }
}
