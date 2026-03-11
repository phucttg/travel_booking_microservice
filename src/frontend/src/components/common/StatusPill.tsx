import { ReactNode } from 'react';
import { theme } from 'antd';
import { StatusTone } from '@utils/presentation';

type StatusPillProps = {
  label: ReactNode;
  tone?: StatusTone;
  subtle?: boolean;
};

const getToneStyles = (tone: StatusTone) => {
  switch (tone) {
    case 'info':
      return { background: 'rgba(15, 108, 189, 0.12)', borderColor: 'rgba(15, 108, 189, 0.18)', color: '#0f6cbd' };
    case 'success':
      return { background: 'rgba(18, 128, 92, 0.12)', borderColor: 'rgba(18, 128, 92, 0.18)', color: '#12805c' };
    case 'warning':
      return { background: 'rgba(217, 119, 6, 0.12)', borderColor: 'rgba(217, 119, 6, 0.18)', color: '#b35a00' };
    case 'danger':
      return { background: 'rgba(207, 63, 79, 0.12)', borderColor: 'rgba(207, 63, 79, 0.18)', color: '#b42337' };
    case 'accent':
      return { background: 'rgba(19, 144, 140, 0.12)', borderColor: 'rgba(19, 144, 140, 0.18)', color: '#0b8f88' };
    default:
      return { background: 'rgba(100, 116, 139, 0.12)', borderColor: 'rgba(100, 116, 139, 0.18)', color: '#52606d' };
  }
};

export const StatusPill = ({ label, tone = 'neutral', subtle = false }: StatusPillProps) => {
  const { token } = theme.useToken();
  const toneStyles = getToneStyles(tone);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: subtle ? '5px 10px' : '6px 12px',
        borderRadius: 999,
        fontSize: 12,
        lineHeight: 1,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        border: `1px solid ${toneStyles.borderColor}`,
        background: toneStyles.background,
        color: toneStyles.color,
        whiteSpace: 'nowrap',
        boxShadow: `0 1px 0 ${token.colorBgContainer}`
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: toneStyles.color,
          flexShrink: 0
        }}
      />
      {label}
    </span>
  );
};
