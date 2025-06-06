import { globalStyle } from "@vanilla-extract/css";
import { textColor } from "./colors.css";

globalStyle('body', {
    fontFamily: "Pretendard, sans-serif",
    color: textColor.body,
})