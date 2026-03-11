import { Table, TableProps } from 'antd';
import { ReactNode } from 'react';

type DataTableProps<T extends object> = {
  title?: ReactNode;
} & TableProps<T>;

export const DataTable = <T extends object>({ title, ...props }: DataTableProps<T>) => {
  return (
    <div className="app-surface" style={{ borderRadius: 24, overflow: 'hidden' }}>
      <Table<T>
        title={title ? () => <>{title}</> : undefined}
        rowKey="id"
        scroll={props.scroll || { x: 900 }}
        pagination={props.pagination ? { position: ['bottomRight'], ...props.pagination } : props.pagination}
        {...props}
      />
    </div>
  );
};
