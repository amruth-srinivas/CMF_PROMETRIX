import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Empty, Modal, Space, Spin, Table, Tag, Typography, message } from 'antd';
import {
  ClockCircleOutlined,
  CloudDownloadOutlined,
  ExperimentOutlined,
  FileSearchOutlined,
  ReloadOutlined,
  SendOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { QUALITY_API_BASE_URL } from '../Config/qualityconfig';

const { Title, Text } = Typography;

const monoStyle = { fontFamily: '"JetBrains Mono", "Consolas", "Courier New", monospace' };

const fmtTol = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) < 1e-12) return '0';
  return n > 0 ? `+${n}` : `${n}`;
};

const dimensionTypeTagColor = (value) => {
  const v = (value || '').toString().toLowerCase();
  if (!v) return 'default';
  if (v.includes('diameter')) return 'gold';
  if (v.includes('length') || v.includes('linear')) return 'blue';
  if (v.includes('angle')) return 'purple';
  return 'geekblue';
};

function buildInspectorSearchParams(op, mode) {
  const opParts = [];
  if (op.operation_number != null && op.operation_number !== '') opParts.push(String(op.operation_number));
  if (op.operation_name) opParts.push(op.operation_name);
  const operationLabel = opParts.join(': ') || '—';

  const qs = new URLSearchParams({
    projectName: op.project_name || '',
    partName: op.part_name || '',
    operationName: operationLabel,
    fileName: op.preview_document_name || 'Drawing.pdf',
    partId: String(op.part_id ?? ''),
    partNumber: op.part_number || '',
    operationNumber: String(op.operation_number ?? ''),
    operationId: String(op.operation_id ?? ''),
    orderId: String(op.order_id ?? ''),
    isPdf: 'true',
    mode,
  });

  if (op.preview_document_id != null && op.preview_endpoint) {
    qs.set('documentId', String(op.preview_document_id));
    qs.set(
      'drawingUrl',
      `${QUALITY_API_BASE_URL}/${op.preview_endpoint}/${op.preview_document_id}/preview`,
    );
  } else {
    qs.set('drawingUrl', '');
  }

  const name = (op.preview_document_name || '').toLowerCase();
  const isPdf = name.endsWith('.pdf') || name.includes('pdf') || !op.preview_document_id;
  qs.set('isPdf', String(isPdf));

  return qs;
}

const InspectionResults = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [machineId, setMachineId] = useState(null);
  const [machineLabel, setMachineLabel] = useState('');
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState(null);
  const [planViewOpen, setPlanViewOpen] = useState(false);
  const [planViewLoading, setPlanViewLoading] = useState(false);
  const [planTableRows, setPlanTableRows] = useState([]);
  const [planDrawingUrl, setPlanDrawingUrl] = useState('');
  const [planDrawingIsPdf, setPlanDrawingIsPdf] = useState(true);
  const [planViewMeta, setPlanViewMeta] = useState(null);

  const pdfEmbedSrcForReview = (url) => {
    if (!url) return '';
    return `${url}${url.includes('?') ? '&' : '?'}toolbar=1&navpanes=1&scrollbar=1&view=FitH`;
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    let mid = null;
    try {
      const raw = localStorage.getItem('selectedMachine');
      if (raw) {
        const m = JSON.parse(raw);
        mid = m?.id ?? null;
        const label = [m?.type, m?.make, m?.model].filter(Boolean).join(' ').trim();
        setMachineLabel(label || (m?.id != null ? `Machine #${m.id}` : ''));
        setMachineId(mid);
      } else {
        setMachineId(null);
        setMachineLabel('');
      }
    } catch {
      setMachineId(null);
      setMachineLabel('');
    }

    if (mid == null) {
      setPayload(null);
      setLoading(false);
      return;
    }

    try {
      const res = await axios.get(`${QUALITY_API_BASE_URL}/operator/machine-inprogress/${mid}`);
      setPayload(res.data);
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : err.message || 'Failed to load in-progress operations');
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openInspector = (op, mode) => {
    const qs = buildInspectorSearchParams(op, mode);
    navigate(`/operator/qms-inspector?${qs.toString()}`);
  };

  const openPlanViewModal = async (op) => {
    setPlanViewMeta({
      orderNo: op.sale_order_number ?? op.order_id ?? '—',
      partNo: op.part_number || '—',
      opNo: op.operation_number ?? '—',
      opName: op.operation_name || '',
    });
    setPlanViewOpen(true);
    setPlanViewLoading(true);
    setPlanTableRows([]);
    if (op.preview_document_id != null && op.preview_endpoint) {
      const drawUrl = `${QUALITY_API_BASE_URL}/${op.preview_endpoint}/${op.preview_document_id}/preview`;
      setPlanDrawingUrl(drawUrl);
      const name = (op.preview_document_name || '').toLowerCase();
      setPlanDrawingIsPdf(name.endsWith('.pdf') || name.includes('pdf'));
    } else {
      setPlanDrawingUrl('');
      setPlanDrawingIsPdf(true);
    }

    const opNo = Number(op.operation_number);
    try {
      const res = await axios.get(`${QUALITY_API_BASE_URL}/quality/master-boc`, {
        params: {
          part_id: op.part_number,
          sales_order_id: Number(op.order_id),
          op_no: Number.isFinite(opNo) ? opNo : undefined,
        },
      });
      setPlanTableRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail;
      message.error(typeof detail === 'string' ? detail : err.message || 'Failed to load plan details');
    } finally {
      setPlanViewLoading(false);
    }
  };

  const handleDownloadPlanDrawing = () => {
    if (!planDrawingUrl) return;
    const a = document.createElement('a');
    a.href = planDrawingUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.download = `operation_${planViewMeta?.opNo || 'plan'}_balloon.pdf`;
    a.click();
  };

  const sendPlanRequest = async (op) => {
    const mid = machineId;
    if (mid == null || op.order_id == null || op.part_id == null || op.operation_id == null) {
      message.error('Missing machine or operation context.');
      return;
    }
    try {
      await axios.post(`${QUALITY_API_BASE_URL}/operator/request-inspection-plan`, {
        machine_id: mid,
        order_id: op.order_id,
        part_id: op.part_id,
        operation_id: op.operation_id,
      });
      message.success('Request sent. A supervisor can create the inspection plan.');
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail;
      message.error(typeof detail === 'string' ? detail : err.message || 'Could not send request');
    }
  };

  const operations = payload?.operations || [];
  const total = payload?.total_inprogress_operations ?? operations.length;
  const tableData = useMemo(
    () =>
      operations.map((op, idx) => ({
        ...op,
        key: `${op.order_id}-${op.part_id}-${op.operation_id}-${op.started_at || ''}-${idx}`,
      })),
    [operations],
  );

  const columns = useMemo(
    () => [
      {
        title: 'Order',
        key: 'order',
        width: 150,
        render: (_, record) => (
          <div>
            <Text strong>{record.sale_order_number ? `#${record.sale_order_number}` : `ID ${record.order_id}`}</Text>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Order ID: {record.order_id}
              </Text>
            </div>
          </div>
        ),
      },
      {
        title: 'Part',
        key: 'part',
        width: 280,
        render: (_, record) => (
          <div>
            <Text strong>{record.part_number || '—'}</Text>
            <div>
              <Text type="secondary">{record.part_name || '—'}</Text>
            </div>
          </div>
        ),
      },
      {
        title: 'Operation',
        key: 'operation',
        width: 220,
        render: (_, record) => (
          <div>
            <Text strong>
              {record.operation_number != null ? `${record.operation_number}: ` : ''}
              {record.operation_name || '—'}
            </Text>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Op ID: {record.operation_id}
              </Text>
            </div>
          </div>
        ),
      },
      {
        title: 'Started',
        key: 'started_at',
        width: 180,
        render: (_, record) => (
          <Space size={6}>
            <ClockCircleOutlined style={{ color: '#1677ff' }} />
            <Text>{record.started_at ? new Date(record.started_at).toLocaleString() : '—'}</Text>
          </Space>
        ),
      },
      {
        title: 'Plan Status',
        key: 'plan',
        width: 150,
        render: (_, record) =>
          record.has_inspection_plan ? <Tag color="success">Plan Available</Tag> : <Tag color="warning">Plan Needed</Tag>,
      },
      {
        title: 'Actions',
        key: 'actions',
        fixed: 'right',
        width: 280,
        render: (_, record) =>
          record.has_inspection_plan ? (
            <Space>
              <Button type="primary" icon={<FileSearchOutlined />} onClick={() => void openPlanViewModal(record)}>
                View Plan
              </Button>
              <Button icon={<ExperimentOutlined />} onClick={() => openInspector(record, 'MEASURE')}>
                Measure
              </Button>
            </Space>
          ) : (
            <Space>
              <Button type="primary" icon={<SendOutlined />} onClick={() => void sendPlanRequest(record)}>
                Send Request
              </Button>
              <Button disabled title="Create an inspection plan first (via supervisor)">
                Measure
              </Button>
            </Space>
          ),
      },
    ],
    [openInspector],
  );

  return (
    <div style={{ maxWidth: 1220 }}>
      <Card
        bordered={false}
        style={{
          borderRadius: 14,
          boxShadow: '0 6px 20px rgba(15, 23, 42, 0.08)',
          marginBottom: 16,
          background: 'linear-gradient(180deg, #f8fbff 0%, #ffffff 90%)',
        }}
        bodyStyle={{ padding: '20px 24px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ExperimentOutlined style={{ fontSize: 28, color: '#1677ff' }} />
            <div>
              <Title level={3} style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>
                Inspection Queue
              </Title>
              <Text type="secondary" style={{ fontSize: 14 }}>
                In-progress operations with quick access to QMS inspector modes
              </Text>
            </div>
          </div>
          <Button icon={<ReloadOutlined />} onClick={() => void load()}>
            Refresh
          </Button>
        </div>
        <Space size={12} wrap>
          {machineLabel ? (
            <Tag color="blue" style={{ padding: '4px 10px', borderRadius: 16 }}>
              <ToolOutlined style={{ marginRight: 6 }} />
              {machineLabel}
            </Tag>
          ) : null}
          <Tag color="processing" style={{ padding: '4px 10px', borderRadius: 16 }}>
            Active Operations: {total}
          </Tag>
        </Space>
      </Card>

      <Spin spinning={loading}>
        {machineId == null && !loading ? (
          <Card>
            <Empty
              description="Log in with a machine first (operator login, step 1) to see in-progress operations."
            />
          </Card>
        ) : null}

        {machineId != null && error ? (
          <Card>
            <Text type="danger">{error}</Text>
            <div style={{ marginTop: 12 }}>
              <Button onClick={() => void load()}>Retry</Button>
            </div>
          </Card>
        ) : null}

        {machineId != null && !error && !loading && total === 0 ? (
          <Card>
            <Empty description="No in-progress operations for this machine right now." />
          </Card>
        ) : null}

        {machineId != null && !error && !loading && total > 0 ? (
          <Card
            bordered={false}
            style={{ borderRadius: 14, boxShadow: '0 6px 20px rgba(15, 23, 42, 0.08)' }}
            bodyStyle={{ padding: 0 }}
          >
            <Table
              columns={columns}
              dataSource={tableData}
              pagination={false}
              scroll={{ x: 1200 }}
              rowClassName={(_, index) => (index % 2 === 0 ? 'operator-row-even' : 'operator-row-odd')}
            />
          </Card>
        ) : null}
      </Spin>

      <Modal
        title={`Operation ${planViewMeta?.opNo || '—'}: ${planViewMeta?.opName || 'Details'}`}
        centered
        footer={null}
        width="95%"
        onCancel={() => setPlanViewOpen(false)}
        open={planViewOpen}
        styles={{ body: { padding: 12, height: '80vh', background: '#f7f8fa' } }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: 14, height: '100%', ...monoStyle }}>
          <div style={{ border: '1px solid #dfe4ea', borderRadius: 10, overflow: 'hidden', background: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 10px rgba(15,23,42,0.04)' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #eef0f3', background: '#fafbfc' }}>
              <Text strong style={{ color: '#111827', fontSize: 22, lineHeight: 1.2, ...monoStyle }}>Inspection Details</Text>
              <div style={{ marginTop: 10, fontSize: 16, color: '#374151' }}>
                <Text style={{ fontSize: 16, ...monoStyle }}><b>Order:</b> {planViewMeta?.orderNo || '—'}</Text>
                <Text style={{ fontSize: 16, marginLeft: 18, ...monoStyle }}><b>Part:</b> {planViewMeta?.partNo || '—'}</Text>
                <Text style={{ fontSize: 16, marginLeft: 18, ...monoStyle }}><b>Operation:</b> {planViewMeta?.opNo || '—'}</Text>
              </div>
            </div>
            <div style={{ padding: '0 10px 10px', flex: 1, minHeight: 0 }}>
              <Table
                size="small"
                loading={planViewLoading}
                dataSource={planTableRows}
                rowKey="id"
                pagination={{ pageSize: 14, showSizeChanger: false }}
                scroll={{ x: 'max-content', y: 520 }}
                columns={[
                  { title: 'S.No', key: 'sno', width: 82, render: (_, __, idx) => <Text style={{ ...monoStyle, fontSize: 13 }}>{idx + 1}</Text> },
                  { title: 'Zone', dataIndex: 'zone', key: 'zone', width: 90, render: (z) => <Tag color="geekblue" style={{ margin: 0, borderRadius: 10, ...monoStyle }}>{z || '—'}</Tag> },
                  { title: 'Description', dataIndex: 'dimension_type', key: 'dimension_type', width: 240, render: (val) => <Tag color={dimensionTypeTagColor(val)} style={{ margin: 0, borderRadius: 10, ...monoStyle }}>{val || '—'}</Tag> },
                  { title: 'Nominal', dataIndex: 'nominal', key: 'nominal', width: 130, render: (v) => <Text style={{ ...monoStyle, color: '#1f2937', fontSize: 13 }}>{v ?? '—'}</Text> },
                  { title: 'Upper Tol', dataIndex: 'uppertol', key: 'uppertol', width: 130, render: (v) => <Text style={{ ...monoStyle, color: Number(v) > 0 ? '#15803d' : '#6b7280', fontSize: 13 }}>{fmtTol(v)}</Text> },
                  { title: 'Lower Tol', dataIndex: 'lowertol', key: 'lowertol', width: 130, render: (v) => <Text style={{ ...monoStyle, color: Number(v) < 0 ? '#b91c1c' : '#6b7280', fontSize: 13 }}>{fmtTol(v)}</Text> },
                ]}
              />
            </div>
          </div>
          <div style={{ border: '1px solid #dfe4ea', borderRadius: 10, overflow: 'hidden', background: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 10px rgba(15,23,42,0.04)' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid #eef0f3', background: '#fafbfc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text strong style={{ color: '#111827', ...monoStyle }}>Drawing View</Text>
              <Button size="small" icon={<CloudDownloadOutlined />} onClick={handleDownloadPlanDrawing} disabled={!planDrawingUrl}>
                Download Drawing
              </Button>
            </div>
            <div style={{ flex: 1, minHeight: 0, padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
              {planViewLoading ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin /></div>
              ) : planDrawingUrl ? (
                planDrawingIsPdf ? (
                  <iframe
                    title="Balloon document"
                    src={pdfEmbedSrcForReview(planDrawingUrl)}
                    style={{ width: '100%', minHeight: 480, height: 'min(72vh, 900px)', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff', boxShadow: '0 2px 10px rgba(15,23,42,0.08)' }}
                  />
                ) : (
                  <img
                    src={planDrawingUrl}
                    alt="Ballooned drawing"
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff', boxShadow: '0 2px 10px rgba(15,23,42,0.08)' }}
                  />
                )
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Empty description="No balloon document found for this operation" />
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InspectionResults;
