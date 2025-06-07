import { style, styleVariants } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { colors } from "../../styles/tokens";

const baseAlert = style({
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "stretch",
  padding: "4px 12px 4px 14px",
});

export const alertTypeStyles = styleVariants({
  info: {},
  confirm: {},
  "save-temporarily": {},
  secret: {},
});

export const alertSizeStyles = styleVariants({
  medium: {},
  small: {},
});

export const alertLayoutStyles = styleVariants({
  default: {},
  expanded: {},
});

export const closeButton = style({});

export const textButton = style({});

export const alertRecipe = recipe({
  base: baseAlert,
  variants: {
    type: alertTypeStyles,
    size: alertSizeStyles,
    layout: alertLayoutStyles,
  },
  defaultVariants: {
    type: "info",
    size: "medium",
    layout: "default",
  },
});
