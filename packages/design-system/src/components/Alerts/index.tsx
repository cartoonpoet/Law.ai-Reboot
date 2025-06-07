import React from 'react';
import { AlertProps } from './type';

const Alerts: React.FC<AlertProps> = ({
  type = 'info',
  size = 'medium',
  layout = 'default',
  hasXButton = false,
  hasTextButton = false,
  children,
  onClose,
  onTextButtonClick,
}) => {
  return <div>Alerts</div>;
};

export default Alerts;