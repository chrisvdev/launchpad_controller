import Button from "@launchpad/button.js";
import type Pixel from "@launchpad/pixel.js";
import type { AxisCoordinate } from "@launchpad/types.js";

export const GRID_SIZE = 9;

const AXIS_COORDINATES = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;

export type ButtonFactory = (
  x: AxisCoordinate,
  y: AxisCoordinate
) => Button;

/** Colección inmutable de los 81 botones de un Launchpad. */
export default class ButtonGrid {
  #matrix: ReadonlyArray<ReadonlyArray<Button>>;

  constructor(createButton: ButtonFactory) {
    const columns = AXIS_COORDINATES.map((x) =>
      Object.freeze(AXIS_COORDINATES.map((y) => createButton(x, y)))
    );
    this.#matrix = Object.freeze(columns);
  }

  /** Vista de solo lectura indexada como `[x][y]`. */
  get matrix(): ReadonlyArray<ReadonlyArray<Button>> {
    return this.#matrix;
  }

  /** Devuelve un botón o `undefined` cuando la coordenada está fuera de rango. */
  at(x: number, y: number): Button | undefined {
    if (!Number.isInteger(x) || !Number.isInteger(y)) return undefined;
    return this.#matrix[x]?.[y];
  }

  /** Recorre los botones conservando sus coordenadas de matriz. */
  forEach(
    callback: (button: Button, x: AxisCoordinate, y: AxisCoordinate) => void
  ) {
    for (const column of this.#matrix) {
      for (const button of column) {
        const { x, y } = button.getCoordinate();
        callback(button, x, y);
      }
    }
  }

  /** Aplana el estado visual actual para un renderizado completo. */
  getPixels(): Pixel[] {
    const pixels: Pixel[] = [];
    this.forEach((button) => pixels.push(button.getPixel()));
    return pixels;
  }
}