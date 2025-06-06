import { createGlobalTheme } from "@vanilla-extract/css";

export const spacing = createGlobalTheme(':root', {
    xs: '4px',
    s: '8px',
    m: '12px',
    l: '16px'
});