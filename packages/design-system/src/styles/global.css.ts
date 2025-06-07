import { globalStyle } from "@vanilla-extract/css";
import { textColor } from "./tokens";

globalStyle("body", {
  fontFamily: "Pretendard, sans-serif",
  color: textColor.body,
});
