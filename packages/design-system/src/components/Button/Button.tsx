import React from 'react';
import { variants } from './Button.css';

type ButtonProps = {
  variant?: keyof typeof variants;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  children,
  onClick,
  disabled = false,
}) => {
  return (
    <button
      className={variants[variant]}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}; 