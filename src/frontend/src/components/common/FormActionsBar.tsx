import { ReactNode } from 'react';

type FormActionsBarProps = {
  children: ReactNode;
};

export const FormActionsBar = ({ children }: FormActionsBarProps) => {
  return <div className="form-actions-bar">{children}</div>;
};
