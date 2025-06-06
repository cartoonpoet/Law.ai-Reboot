import { createGlobalTheme } from "@vanilla-extract/css";

// 색상
export const color = createGlobalTheme(':root', {
    primary: '#2151ec',
    secondary: '#82868b',
    success: '#28c76f',
    danger: 'ea5455',
    warning: '#f0af23',
    info: '#00cfe8',
    dark: '#4c5469',
    light: '#9ea7b8',
    tableHeader: '#f1f4f9',
    body: '#f8fafc',
    disabled: '#eeeff2',
});

// 텍스트 색상
export const textColor = createGlobalTheme(':root', {
    heading: '#11152a',
    display: '#11152a',
    muted: '#626f86',
    placeholder: '#626f86',
    body: '#000000',
    disabled: '#9ea7b8',
});

// 송무>사건 일정 텍스트
export const scourtColor = createGlobalTheme(':root', {
    blue: '#003399',
    green: '#336633',
    red: '#660000',
    yellow: '#cc6600'
});

// 전자서명 텍스트
export const stampColor = createGlobalTheme(':root', {
    stamp: '#ff0000'
});

