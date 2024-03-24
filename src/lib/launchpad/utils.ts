import {
  AxisCoordinate,
  ButtonEventListener,
  CodeCoordinate,
  Coordinate,
  DefaultPixelMaker,
  MIDIData,
  PalletCode,
  PalletPrimaryColor,
  Log,
  MIDIEventListener,
  MIDIMessageType,
  PalletColorCode,
  RGBPrimaryColor,
  SysexData,
} from "@launchpad/types.js";

import Button from "@launchpad/button.js";
import type Panel from "@launchpad/panel.js";

export function getPosition(x: AxisCoordinate, y: AxisCoordinate) {
  const res = 10 * (y + 1) + (x + 1); /* 
  console.log(x, y, res); */
  return res as CodeCoordinate;
}

export function getCoordinates(code: CodeCoordinate) {
  return {
    x: (code % 10) - 1,
    y: Math.floor(code / 10) - 1,
  };
}

export function makePanelButtons(panel: Panel) {
  const buttons: Button[][] = [];
  for (let x = 0; x <= 8; x++) {
    buttons.push([]);
    for (let y = 0; y <= 8; y++) {
      buttons[x]?.push(new Button(x, y, panel));
    }
  }
  return buttons;
}

export function sysexMessage(data: SysexData) {
  return [240, ...data, 247];
}

export function getColor(
  red: PalletPrimaryColor,
  green: PalletPrimaryColor,
  blue: PalletPrimaryColor,
  h = false
) {
  return (red * 16 + green * 4 + blue + (h ? 64 : 0)) as PalletColorCode;
}
