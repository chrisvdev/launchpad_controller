import type {
  Note,
  PolyAfterTouch,
  ControlChange,
  Program,
  ChannelAfterTouch,
  Pitch,
  Position,
  Mtc,
  Select,
  Sysex,
} from "easymidi";
import type Panel, { Button } from "@launchpad/panel.ts";
import { Pixel } from "@launchpad/launchpad.ts";
export type SysexData = number[];
export type Coordinate = {
  x: AxisCoordinate;
  y: AxisCoordinate;
};
export type AxisCoordinate = IntRange<0, 8>;
export type CodeCoordinate = IntRange<11, 19> &
  IntRange<21, 29> &
  IntRange<31, 39> &
  IntRange<41, 49> &
  IntRange<51, 59> &
  IntRange<61, 69> &
  IntRange<71, 79> &
  IntRange<81, 89> &
  IntRange<91, 99>;
export type PalletCode = IntRange<0, 127>;
export type PalletColorCode = IntRange<0, 63>;
export type PalletPrimaryColor = IntRange<0, 3>;
export type RGBPrimaryColor = IntRange<0, 127>;
export type Log = boolean;
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
type _MIDIData =
  | Note
  | PolyAfterTouch
  | ControlChange
  | Program
  | ChannelAfterTouch
  | Pitch
  | Position
  | Mtc
  | Select
  | Sysex;
export type MIDIData = _MIDIData & {
  _type: MIDIMessageType;
  note: CodeCoordinate;
  controller: CodeCoordinate;
  velocity: 0 | 127;
  value: 0 | 127;
};
export type MIDIEventListener = (msg: MIDIData) => void;
export type ButtonEventListener = (
  button: Button,
  panel: Panel,
  msg: MIDIData
) => void;
export type DefaultPixelMaker = (x: AxisCoordinate, y: AxisCoordinate) => Pixel;
export type Frame = {
  pixels: Pixel[];
  TTL: number;
};
export type Frames = Frame[];
