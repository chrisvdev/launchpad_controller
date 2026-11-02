import type {
  AxisCoordinate,
  CodeCoordinate,
  Coordinate,
  PalletCode,
  PalletPrimaryColor,
  SysexData,
} from "@launchpad/types.js";

/**
 * Convierte una coordenada de matriz basada en cero al código de posición MIDI
 * del Launchpad. El dispositivo organiza la matriz de 9 por 9 como `11..19`,
 * `21..29`, hasta `91..99`.
 *
 * @param x - Columna de la matriz, de 0 a 8.
 * @param y - Fila de la matriz, de 0 a 8.
 * @returns Código de posición MIDI para el dispositivo.
 */
export function getPosition(x: AxisCoordinate, y: AxisCoordinate) {
  const res = 10 * (y + 1) + (x + 1); /* 
  console.log(x, y, res); */
  return res as CodeCoordinate;
}

/**
 * Convierte un código de posición MIDI del Launchpad a una coordenada de
 * matriz basada en cero.
 *
 * @param code - Código de posición MIDI recibido del dispositivo.
 * @returns Columna y fila representadas por el código.
 */
export function getCoordinates(code: CodeCoordinate): Coordinate | undefined {
  if (!Number.isInteger(code)) return undefined;

  const x = (code % 10) - 1;
  const y = Math.floor(code / 10) - 1;
  if (x < 0 || x > 8 || y < 0 || y > 8) return undefined;

  return { x, y };
}

/**
 * Envuelve una carga útil SysEx con los bytes MIDI de inicio (`240`) y fin
 * (`247`).
 *
 * @param data - Carga útil SysEx sin los bytes de delimitación.
 * @returns Mensaje SysEx completo listo para `easymidi`.
 */
export function sysexMessage(data: SysexData) {
  return [240, ...data, 247];
}

/**
 * Codifica tres componentes de paleta de cuatro niveles como un índice de
 * paleta del Launchpad. Si `h` está activado, el índice se mueve al banco alto
 * de la paleta, de 64 a 127.
 *
 * @param red - Componente rojo de la paleta, de 0 a 3.
 * @param green - Componente verde de la paleta, de 0 a 3.
 * @param blue - Componente azul de la paleta, de 0 a 3.
 * @param h - Indica si se selecciona el banco alto de la paleta.
 * @returns Índice de paleta del Launchpad codificado.
 */
export function getColor(
  red: PalletPrimaryColor,
  green: PalletPrimaryColor,
  blue: PalletPrimaryColor,
  h = false
) {
  return red * 16 + green * 4 + blue + (h ? 64 : 0) as PalletCode;
}
