import React from 'react';
import { Button, Typography } from 'antd';
import { icon8 } from './inspectorIcons8';

const { Text } = Typography;

const C = {
  label: '#595959',
  labelActive: '#262626',
  danger: '#cf1322',
  header: '#8c8c8c',
  border: '#d9d9d9',
  borderActive: '#bfbfbf',
  surface: '#ffffff',
  surfaceActive: '#f5f5f5',
  rail: '#fafafa',
  divider: '#f0f0f0',
};

/** Icons8 PNG colors (hex, no #). */
const iconHex = (active, danger, disabled) => {
  if (disabled) return 'bfbfbf';
  if (danger) return 'cf1322';
  return active ? '262626' : '595959';
};

const SidebarDivider = () => (
  <div style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '10px 12px' }}>
    <div style={{ flex: 1, height: 1, background: C.divider }} />
    <div
      style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        border: `1px solid ${C.border}`,
        margin: '0 8px',
        background: C.surface,
      }}
    />
    <div style={{ flex: 1, height: 1, background: C.divider }} />
  </div>
);

const SidebarItem = ({
  iconSrc,
  label,
  active = false,
  danger = false,
  onClick,
  disabled = false,
}) => {
  const labelColor = danger ? C.danger : active ? C.labelActive : C.label;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        width: '100%',
        padding: '8px 0',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <Button
        type="text"
        disabled={disabled}
        onClick={onClick}
        style={{
          height: 42,
          width: 42,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: active ? C.surfaceActive : C.surface,
          border: `1px solid ${active ? C.borderActive : C.border}`,
          borderRadius: 10,
          padding: 0,
          boxShadow: active ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.04)',
        }}
      >
        <img src={iconSrc} width={22} height={22} alt="" style={{ display: 'block' }} />
      </Button>
      <Text style={{ fontSize: 11, color: labelColor, fontWeight: 500 }}>{label}</Text>
    </div>
  );
};

const SectionHeader = ({ title }) => (
  <div style={{ padding: '12px 0 4px 0', width: '100%', textAlign: 'center' }}>
    <Text strong style={{ fontSize: 10, color: C.header, letterSpacing: '0.08em' }}>
      {title}
    </Text>
  </div>
);

const InspectorSidebar = ({
  activeTool = 'select',
  onToolChange,
  onZoomIn,
  onZoomOut,
  onRotate,
  onResetView,
  onClearAll,
  onAutoBalloon,
  clearAllDisabled = false,
  autoBalloonDisabled = false,
}) => {
  const set = (t) => () => onToolChange?.(t);

  const tool = (name, active) => icon8[name](iconHex(active, false, false));
  const viewIcon = (key) => icon8[key](iconHex(false, false, false));

  return (
    <div
      style={{
        width: 85,
        background: C.rail,
        borderRight: `1px solid ${C.divider}`,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        alignItems: 'center',
        overflowY: 'auto',
        overflowX: 'hidden',
        boxShadow: 'inset -1px 0 0 rgba(0,0,0,0.02)',
      }}
    >
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <SectionHeader title="TOOLS" />
        <SidebarItem
          iconSrc={tool('select', activeTool === 'select')}
          label="Select"
          active={activeTool === 'select'}
          onClick={set('select')}
        />
        <SidebarItem iconSrc={tool('pan', activeTool === 'pan')} label="Pan" active={activeTool === 'pan'} onClick={set('pan')} />
        <SidebarItem iconSrc={tool('stamp', activeTool === 'stamp')} label="Stamp" active={activeTool === 'stamp'} onClick={set('stamp')} />
        <SidebarItem iconSrc={tool('notes', activeTool === 'notes')} label="Notes" active={activeTool === 'notes'} onClick={set('notes')} />

        <SidebarDivider />

        <SectionHeader title="VIEW" />
        <SidebarItem iconSrc={viewIcon('zoomIn')} label="Zoom In" onClick={onZoomIn} />
        <SidebarItem iconSrc={viewIcon('zoomOut')} label="Zoom Out" onClick={onZoomOut} />
        <SidebarItem iconSrc={viewIcon('rotate')} label="Rotate" onClick={onRotate} />
        <SidebarItem iconSrc={viewIcon('reset')} label="Reset" onClick={onResetView} />

        <SidebarDivider />

        <SectionHeader title="ACTIONS" />
        <SidebarItem
          iconSrc={icon8.autoBalloon(iconHex(false, false, autoBalloonDisabled))}
          label="Auto Balloon"
          disabled={autoBalloonDisabled}
          onClick={autoBalloonDisabled ? undefined : onAutoBalloon}
        />
        <SidebarItem
          iconSrc={icon8.clear(iconHex(false, true, clearAllDisabled))}
          label="Clear All"
          danger
          onClick={onClearAll}
          disabled={clearAllDisabled}
        />
      </div>
    </div>
  );
};

export default InspectorSidebar;
