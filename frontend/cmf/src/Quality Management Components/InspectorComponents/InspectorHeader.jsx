import React from 'react';
import { Space, Button, Typography, Divider, Tag } from 'antd';
import { ArrowLeftOutlined, ExportOutlined, SaveOutlined, SettingOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

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
  planConfirmed = false,
  onConfirm,
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
          onClick={() => navigate(-1)}
          style={{ 
            borderRadius: '6px', 
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          icon={<ArrowLeftOutlined />}
        >
          Back
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
        {planConfirmed && (
          <Tag color="success" style={{ marginLeft: 16 }}>PLAN FINALIZED</Tag>
        )}
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
          onClick={onConfirm}
          disabled={planConfirmed}
          icon={planConfirmed ? <CheckCircleOutlined /> : <SaveOutlined />}
        >
          {planConfirmed ? 'CONFIRMED' : 'CONFIRM'}
        </Button>
        <Button style={{ height: '36px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <ExportOutlined style={{ fontSize: 16, color: '#64748b' }} />
          EXPORT
        </Button>
        <Button type="text" icon={<SettingOutlined style={{ fontSize: 18, color: '#64748b' }} />} />
      </Space>
    </div>
  );
};

export default InspectorHeader;
