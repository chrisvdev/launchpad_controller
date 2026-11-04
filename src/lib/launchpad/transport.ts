import type Pixel from "@launchpad/pixel.js";
import type { MIDIEventListener, SysexData } from "@launchpad/types.js";

/** Transporte del dispositivo físico usado por el agregado Launchpad. */
export default interface LaunchpadTransport {
  subscribe(listener: MIDIEventListener): () => void;
  render(pixels: readonly Pixel[]): void;
  disconnect(): void;
  /** Envía un comando SysEx; `data` va tras la cabecera `0, 32, 41, 2, 13`. */
  sendSysex?(data: SysexData): void;
  /** Envía un tick de MIDI clock (24 por beat). */
  sendClock?(): void;
}

/** Opciones de conexión para el transporte MIDI de easymidi. */
export type LaunchpadConnectionOptions = {
  inputName?: string;
  outputName?: string;
  log?: boolean;
};