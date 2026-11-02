import { Coordinate, SysexData } from "@launchpad/types.js";

/**
 * Describe un LED del Launchpad y su carga útil serializable.
 *
 * Las implementaciones devuelven únicamente su segmento de píxel.
 * {@link Launchpad} agrega la cabecera del dispositivo y el marco SysEx al
 * renderizar uno o más píxeles.
 */
export default interface Pixel {
  /**
   * Construye el segmento de píxel usado por el comando de color LED directo
   * del Launchpad.
   */
  getSysexMessage(): SysexData;

  /**
   * Devuelve la coordenada de matriz basada en cero representada por este píxel.
   */
  getPosition(): Coordinate;
}
