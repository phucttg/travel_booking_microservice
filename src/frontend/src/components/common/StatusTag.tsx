import { Tag } from 'antd';

type StatusTagProps = {
  color: string;
  label: string;
};

export const StatusTag = ({ color, label }: StatusTagProps) => <Tag color={color}>{label}</Tag>;
