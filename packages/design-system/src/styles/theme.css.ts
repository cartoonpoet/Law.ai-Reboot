import { createGlobalTheme } from '@vanilla-extract/css';

export const vars = createGlobalTheme(':root', {
  colors: {
    primary: '#007AFF',
    secondary: '#5856D6',
    background: '#FFFFFF',
    text: '#000000',
    gray: {
      100: '#F5F5F5',
      200: '#EEEEEE',
      300: '#E0E0E0',
      400: '#BDBDBD',
      500: '#9E9E9E',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
    }
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