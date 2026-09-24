import ds3 from "@/assets/platforms/Nintendo_3DS.jpg";
import psp from "@/assets/platforms/PSP.jpg";
import xbox from "@/assets/platforms/XBOX.jpg";
import xbox360 from "@/assets/platforms/XBOX_360.jpg";
import nswitch from "@/assets/platforms/Nintendo_Switch.jpg";
import wii from "@/assets/platforms/Nintendo_Wii.jpg";
import wiiu from "@/assets/platforms/Nintendo_Wii_U.jpg";
import pc from "@/assets/platforms/PC.jpg";
import psvita from "@/assets/platforms/PS_Vita.jpg";
import ps1 from "@/assets/platforms/PlayStation.jpg";
import ps2 from "@/assets/platforms/PlayStation_2.jpg";
import ps3 from "@/assets/platforms/PlayStation_3.jpg";
import ps4 from "@/assets/platforms/PlayStation_4.jpg";
import ps5 from "@/assets/platforms/PlayStation_5.jpg";

export const PLATFORM_ART: Record<string, string> = {
  "3DS": ds3,
  WII: wii,
  WIIU: wiiu,
  SWITCH: nswitch,
  PS1: ps1,
  PS2: ps2,
  PSP: psp,
  PS3: ps3,
  PSVITA: psvita,
  PS4: ps4,
  PS5: ps5,
  PC: pc,
  XBOX: xbox,
  XBOX360: xbox360,
};

export const PLATFORM_LABEL: Record<string, string> = {
  "3DS": "Nintendo 3DS",
  WII: "Nintendo Wii",
  WIIU: "Nintendo Wii U",
  SWITCH: "Nintendo Switch",
  PS1: "PlayStation 1",
  PS2: "PlayStation 2",
  PSP: "PSP",
  PS3: "PlayStation 3",
  PSVITA: "PS Vita",
  PS4: "PlayStation 4",
  PS5: "PlayStation 5",
  XBOX: "Xbox",
  XBOX360: "Xbox 360",
  PC: "PC",
};
