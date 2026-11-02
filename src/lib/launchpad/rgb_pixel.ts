import Pixel from "./pixel.js";
import {
  AxisCoordinate,
  Coordinate,
  RGBPrimaryColor,
  SysexData,
} from "@launchpad/types.js";
import { getPosition } from "@launchpad/utils.js";

/**
 * Un LED con valores de color directos por canal en lugar de un índice de
 * paleta. Su carga útil de color LED directo es
 * `[3, position, red, green, blue]`.
 */
export default class RGBPixel implements Pixel {
  #x;
  #y;
  #red;
  #green;
  #blue;

  /**
    * @param x - Columna del LED basada en cero.
    * @param y - Fila del LED basada en cero.
    * @param red - Intensidad roja en el rango del dispositivo de 0 a 127.
    * @param green - Intensidad verde en el rango del dispositivo de 0 a 127.
    * @param blue - Intensidad azul en el rango del dispositivo de 0 a 127.
   */
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

  /**
    * Serializa este LED RGB como un segmento de píxel de color LED directo.
   */
  getSysexMessage() {
    return [
      3,
      getPosition(this.#x, this.#y),
      this.#red,
      this.#green,
      this.#blue,
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
