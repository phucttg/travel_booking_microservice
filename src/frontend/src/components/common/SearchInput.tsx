import { Input } from 'antd';
import { SearchProps } from 'antd/es/input';
import { useEffect, useRef, useState } from 'react';

type SearchInputProps = {
  placeholder?: string;
  value?: string;
  onSearch: (value: string) => void;
  delay?: number;
} & Omit<SearchProps, 'onSearch'>;

export const SearchInput = ({
  placeholder = 'Search...',
  value,
  onSearch,
  delay = 300,
  ...props
}: SearchInputProps) => {
  const [internalValue, setInternalValue] = useState(value || '');
  const onSearchRef = useRef(onSearch);

  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    setInternalValue(value || '');
  }, [value]);

  useEffect(() => {
    const timer = window.setTimeout(() => onSearchRef.current(internalValue.trim()), delay);
    return () => window.clearTimeout(timer);
  }, [internalValue, delay]);

  return (
    <Input.Search
      allowClear
      size="large"
      placeholder={placeholder}
      value={internalValue}
      onChange={(event) => setInternalValue(event.target.value)}
      {...props}
    />
  );
};
