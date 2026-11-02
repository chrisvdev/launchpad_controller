import Pixel from "./pixel.js";
import {
  AxisCoordinate,
  Coordinate,
  SysexData,
  PalletCode,
} from "@launchpad/types.js";
import { getPosition } from "@launchpad/utils.js";

/**
 * Un LED intermitente administrado por el dispositivo que alterna entre dos
 * índices de paleta. Su carga útil de color LED directo es
 * `[1, position, firstCode, secondCode]`.
 */
export default class FlashingPixel implements Pixel {
  #x;
  #y;
  #code;
  #code2;

  /**
    * @param x - Columna del LED basada en cero.
    * @param y - Fila del LED basada en cero.
    * @param code - Primer índice de paleta del Launchpad.
    * @param code2 - Segundo índice de paleta del Launchpad.
   */
  constructor(
    x: AxisCoordinate,
    y: AxisCoordinate,
    code: PalletCode = 0,
    code2: PalletCode = 0
  ) {
    this.#x = x;
    this.#y = y;
    this.#code = code;
    this.#code2 = code2;
  }

  /**
    * Serializa este LED intermitente como un segmento de píxel de color LED
    * directo.
   */
  getSysexMessage() {
    return [
      1,
      getPosition(this.#x, this.#y),
      this.#code,
      this.#code2,
    ] as SysexData;
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
