import type Button from "@launchpad/button.js";
import type ButtonGrid from "@launchpad/button_grid.js";
import type Pixel from "@launchpad/pixel.js";

/** Secuencia numérica de bytes usada para componer un mensaje MIDI SysEx. */
export type SysexData = number[];

/** Posición basada en cero dentro de una matriz Launchpad de 9 por 9. */
export type AxisCoordinate = number;

/** Coordenada de un botón o LED del Launchpad. */
export type Coordinate = {
  x: AxisCoordinate;
  y: AxisCoordinate;
};

/** Código de posición MIDI usado por el Launchpad. */
export type CodeCoordinate = number;

/** Índice de paleta aceptado por los modos LED basados en paleta. */
export type PalletCode = number;

/** Índice de color generado por `getColor`. */
export type PalletColorCode = PalletCode;

/** Componente de cuatro niveles usado para construir un color de paleta. */
export type PalletPrimaryColor = number;

/** Componente RGB directo aceptado por el dispositivo. */
export type RGBPrimaryColor = number;

/** Nombres de eventos MIDI reenviados por el transporte. */
export type MIDIMessageType =
  | "noteon"
  | "noteoff"
  | "poly aftertouch"
  | "cc"
  | "program"
  | "channel aftertouch"
  | "pitch"
  | "position"
  | "mtc"
  | "select"
  | "clock"
  | "start"
  | "continue"
  | "stop"
  | "activesense"
  | "reset"
  | "sysex";

/** Vista común de los datos MIDI usados por las capas de panel y botón. */
export type MIDIData = {
  _type: MIDIMessageType;
  note: number;
  controller: number;
  velocity: number;
  value: number;
  [key: string]: unknown;
};

/** Recibe un evento MIDI sin filtrar desde el adaptador de hardware. */
export type MIDIEventListener = (message: MIDIData) => void;

/** Crea el píxel en reposo de un botón a partir de su coordenada fija. */
export type DefaultPixelMaker = (
  x: AxisCoordinate,
  y: AxisCoordinate
) => Pixel;

/** Un frame de la API nueva y su duración, en milisegundos. */
export type LaunchpadFrame = {
  pixels: readonly Pixel[];
  duration: number;
};

/** Superficie del agregado expuesta a los callbacks modernos de botón. */
export interface LaunchpadContext {
  readonly buttons: ButtonGrid;
  render(...pixels: Pixel[]): void;
  enqueueFrame(frame: LaunchpadFrame): void;
  clearFrames(): void;
  setTempo(bpm: number | null): void;
  getTempo(): number | null;
  setBrightness(level: number): void;
  setSleep(sleep: boolean): void;
  disconnect(): void;
}

/** Dependencias mínimas que necesita un botón de la API nueva. */
export interface ButtonHost {
  renderFromButton(pixel: Pixel): void;
  getLaunchpad(): LaunchpadContext;
}

/** Callback acumulable de pulsación o liberación de la API nueva. */
export type LaunchpadButtonEventListener = (
  button: Button,
  launchpad: LaunchpadContext,
  message: MIDIData
) => void;