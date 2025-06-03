import { style, styleVariants } from '@vanilla-extract/css';
import { vars } from '../../styles/theme.css';

const base = style({
  padding: `${vars.space.medium} ${vars.space.large}`,
  borderRadius: vars.radii.medium,
  fontSize: vars.fontSizes.medium,
  fontWeight: vars.fontWeights.medium,
  border: 'none',
  cursor: 'pointer',
  transition: 'all 0.2s ease-in-out',
  ':hover': {
    opacity: 0.8,
  },
  ':active': {
    transform: 'scale(0.98)',
  },
});

export const variants = styleVariants({
  primary: [
    base,
    {
      backgroundColor: vars.colors.primary,
      color: vars.colors.background,
    },
  ],
  secondary: [
    base,
    {
      backgroundColor: vars.colors.secondary,
      color: vars.colors.background,
    },
  ],
  outline: [
    base,
    {
      backgroundColor: 'transparent',
      border: `1px solid ${vars.colors.primary}`,
      color: vars.colors.primary,
    },
  ],
}); 