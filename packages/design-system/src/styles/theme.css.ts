import { createGlobalTheme } from "@vanilla-extract/css";
import {
  colors,
  textColors,
  scourtColors,
  stampColors,
  spacing,
  typography,
} from "./tokens";

export const vars = createGlobalTheme(":root", {
  colors,
  textColors,
  scourtColors,
  stampColors,
  spacing,
  typography,
});
