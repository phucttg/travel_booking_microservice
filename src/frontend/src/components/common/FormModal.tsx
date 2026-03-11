import { Modal } from 'antd';
import { PropsWithChildren } from 'react';

type FormModalProps = PropsWithChildren<{
  title: string;
  open: boolean;
  onOk: () => void;
  onCancel: () => void;
  confirmLoading?: boolean;
}>;

export const FormModal = ({
  title,
  open,
  onOk,
  onCancel,
  confirmLoading,
  children
}: FormModalProps) => (
  <Modal
    title={title}
    open={open}
    onOk={onOk}
    onCancel={onCancel}
    confirmLoading={confirmLoading}
    destroyOnClose
  >
    {children}
  </Modal>
);
