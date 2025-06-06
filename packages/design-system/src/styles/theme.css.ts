import { createGlobalTheme } from '@vanilla-extract/css';

export const vars = createGlobalTheme(':root', {
  colors: {
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

    background: '#FFFFFF',
    text: '#000000',
  },
  space: {
    none: '0',
    small: '4px',
    medium: '8px',
    large: '16px',
    xlarge: '24px',
    xxlarge: '32px',
  },
  fontSizes: {
    small: '14px',
    medium: '16px',
    large: '20px',
    xlarge: '24px',
    xxlarge: '32px',
  },
  fontWeights: {
    regular: '400',
    medium: '500',
    bold: '700',
  },
  radii: {
    small: '4px',
    medium: '8px',
    large: '16px',
    round: '9999px',
  },
  shadows: {
    small: '0 1px 2px rgba(0, 0, 0, 0.05)',
    medium: '0 4px 6px rgba(0, 0, 0, 0.1)',
    large: '0 10px 15px rgba(0, 0, 0, 0.1)',
  }
}); 