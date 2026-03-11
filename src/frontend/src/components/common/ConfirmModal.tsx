import { Modal } from 'antd';

type ConfirmModalProps = {
  title?: string;
  description?: string;
  open: boolean;
  confirmLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export const ConfirmModal = ({
  title = 'Xác nhận',
  description = 'Bạn có chắc chắn muốn thực hiện thao tác này?',
  open,
  confirmLoading,
  onConfirm,
  onCancel
}: ConfirmModalProps) => {
  return (
    <Modal
      title={title}
      open={open}
      onOk={onConfirm}
      onCancel={onCancel}
      confirmLoading={confirmLoading}
      okText="Xác nhận"
      cancelText="Hủy"
      okButtonProps={{ danger: true }}
    >
      {description}
    </Modal>
  );
};
