import React from 'react';
import { Space, Button, Typography, Divider } from 'antd';
import { useNavigate } from 'react-router-dom';
import { icon8 } from './inspectorIcons8';

const { Text } = Typography;

const displayOrDash = (value) => {
  const s = (value ?? '').toString().trim();
  return s || '—';
};

const InspectorHeader = ({
  projectName = '',
  partName = '',
  operationName = '',
  fileName = 'Drawing.pdf',
  mode = 'PLAN',
  onModeChange,
}) => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        height: '60px',
        padding: '0 20px',
        background: '#fff',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        zIndex: 10,
      }}
    >
      <Space size="large" align="center">
        <Button
          type="text"
          onClick={() => navigate(-1)}
          style={{ fontWeight: 600, fontSize: '12px', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <img src={icon8.back('64748b')} width={18} height={18} alt="" />
          BACK
        </Button>
        <Divider orientation="vertical" style={{ height: '30px' }} />

        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '220px' }}>
          <Text type="secondary" style={{ fontSize: '10px', textTransform: 'uppercase' }}>
            Project
          </Text>
          <Text strong style={{ fontSize: '13px', maxWidth: '100%' }} ellipsis={projectName ? { tooltip: projectName } : false}>
            {displayOrDash(projectName)}
          </Text>
        </div>

        <Divider orientation="vertical" style={{ height: '30px' }} />

        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '220px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1890ff' }} />
            <Text type="secondary" style={{ fontSize: '10px', textTransform: 'uppercase' }}>
              Part
            </Text>
          </div>
          <Text strong style={{ fontSize: '13px', maxWidth: '100%' }} ellipsis={partName ? { tooltip: partName } : false}>
            {displayOrDash(partName)}
          </Text>
        </div>

        <Divider orientation="vertical" style={{ height: '30px' }} />

        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '240px' }}>
          <Text type="secondary" style={{ fontSize: '10px', textTransform: 'uppercase' }}>
            Operation
          </Text>
          <Text strong style={{ fontSize: '13px', maxWidth: '100%' }} ellipsis={operationName ? { tooltip: operationName } : false}>
            {displayOrDash(operationName)}
          </Text>
        </div>

        <Divider orientation="vertical" style={{ height: '30px' }} />

        <Text type="secondary" style={{ fontSize: '13px', fontStyle: 'italic' }}>
          {fileName}
        </Text>
      </Space>

      <Space size="middle">
        <div style={{ background: '#f5f5f5', padding: '4px', borderRadius: '6px', display: 'flex', gap: '4px' }}>
          <Button
            size="small"
            type={mode === 'PLAN' ? 'primary' : 'text'}
            style={{ fontSize: '12px', minWidth: '70px', height: '28px' }}
            onClick={() => onModeChange?.('PLAN')}
          >
            PLAN
          </Button>
          <Button
            size="small"
            type={mode === 'MEASURE' ? 'primary' : 'text'}
            style={{ fontSize: '12px', minWidth: '70px', height: '28px' }}
            onClick={() => onModeChange?.('MEASURE')}
          >
            MEASURE
          </Button>
        </div>

        <Button
          type="primary"
          style={{ height: '36px', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <img src={icon8.save('ffffff')} width={18} height={18} alt="" />
          SAVE
        </Button>
        <Button style={{ height: '36px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src={icon8.export('64748b')} width={18} height={18} alt="" />
          EXPORT
        </Button>
        <Button type="text" icon={<img src={icon8.settings('64748b')} width={20} height={20} alt="" />} />
      </Space>
    </div>
  );
};

export default InspectorHeader;
