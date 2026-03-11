import type { ThemeConfig } from 'antd';

export const appTheme: ThemeConfig = {
  token: {
    colorPrimary: '#0f6cbd',
    colorInfo: '#0f6cbd',
    colorSuccess: '#12805c',
    colorWarning: '#d97706',
    colorError: '#cf3f4f',
    colorTextBase: '#102a43',
    colorBgBase: '#f4f8fc',
    colorBorder: '#d7e3f4',
    colorLink: '#0f6cbd',
    fontFamily: '"Be Vietnam Pro", "Inter", "Segoe UI", sans-serif',
    borderRadius: 18,
    borderRadiusLG: 24,
    borderRadiusSM: 12,
    controlHeight: 40,
    controlHeightLG: 46,
    boxShadow:
      '0 16px 40px rgba(15, 37, 64, 0.08), 0 3px 10px rgba(15, 37, 64, 0.04)',
    boxShadowSecondary:
      '0 18px 44px rgba(15, 37, 64, 0.1), 0 4px 12px rgba(15, 37, 64, 0.05)'
  },
  components: {
    Layout: {
      headerBg: 'rgba(255,255,255,0.86)',
      siderBg: '#0b1d2a',
      bodyBg: 'transparent',
      triggerBg: '#0f6cbd',
      triggerColor: '#ffffff'
    },
    Menu: {
      darkItemBg: 'transparent',
      darkItemSelectedBg: 'rgba(255,255,255,0.12)',
      darkItemHoverBg: 'rgba(255,255,255,0.08)',
      darkItemSelectedColor: '#ffffff',
      darkSubMenuItemBg: 'transparent',
      darkPopupBg: '#0b1d2a'
    },
    Card: {
      headerBg: 'transparent'
    },
    Breadcrumb: {
      linkColor: '#486581',
      separatorColor: '#7b8794'
    },
    Button: {
      fontWeight: 600,
      controlHeight: 40,
      borderRadius: 14
    },
    Input: {
      controlHeight: 42,
      activeBorderColor: '#0f6cbd',
      hoverBorderColor: '#0f6cbd'
    },
    InputNumber: {
      controlHeight: 42
    },
    Select: {
      controlHeight: 42
    },
    Table: {
      headerBg: '#eff6fb',
      headerColor: '#102a43',
      rowHoverBg: '#f8fbff',
      borderColor: '#d7e3f4'
    },
    Tag: {
      borderRadiusSM: 999
    },
    Modal: {
      borderRadiusLG: 24
    }
  }
};
