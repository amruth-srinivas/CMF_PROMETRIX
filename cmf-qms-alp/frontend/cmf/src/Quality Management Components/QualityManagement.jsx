import React, { useState, useEffect, useMemo } from 'react';
import { Layout, Button, Modal, Table, Spin, Drawer, message, Select } from 'antd';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { MenuOutlined, AppstoreOutlined, ShoppingCartOutlined, ClusterOutlined, ToolOutlined, InfoCircleOutlined, EyeOutlined, BuildOutlined, CheckCircleOutlined, CloudDownloadOutlined } from "@ant-design/icons";
import QualityManagementBOM from './QualityManagementBOM';
import { Card, Tag, Typography, Empty, Space } from 'antd';
import axios from 'axios';
import { QUALITY_API_BASE_URL } from '../Config/qualityconfig';

const { Sider, Content } = Layout;
const { Text, Title } = Typography;

const QualityManagement = ({ initialProductId, initialOrderId, fromOms }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const orderIdFromQuery = searchParams.get('orderId');
  const productIdFromQuery = searchParams.get('productId');
  const qmsInspectorBase = location.pathname.startsWith('/supervisor')
    ? '/supervisor/qms-inspector'
    : '/admin/qms-inspector';
  const effectiveOrderId =
    initialOrderId && String(initialOrderId) !== 'null' && String(initialOrderId) !== ''
      ? initialOrderId
      : orderIdFromQuery || undefined;
  const effectiveProductId =
    initialProductId != null &&
    String(initialProductId) !== '' &&
    String(initialProductId) !== 'null'
      ? initialProductId
      : productIdFromQuery && String(productIdFromQuery) !== 'null'
        ? Number(productIdFromQuery)
        : null;
  const [selectedItem, setSelectedItem] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [productHierarchies, setProductHierarchies] = useState({});
  const [operations, setOperations] = useState([]);
  const [partDocuments, setPartDocuments] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
   const [previewUrl, setPreviewUrl] = useState(null);
  const [previewIsPdf, setPreviewIsPdf] = useState(false);
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [orderStatus, setOrderStatus] = useState(() => (effectiveOrderId ? 'checking' : 'active'));
  const [isCheckingStatus, setIsCheckingStatus] = useState(() => !!effectiveOrderId);
  /** op_no (int) -> 'draft' | 'confirmed' from quality.inspection_plan_status */
  const [inspectionPlanByOp, setInspectionPlanByOp] = useState({});
  const [planViewOpen, setPlanViewOpen] = useState(false);
  const [planViewLoading, setPlanViewLoading] = useState(false);
  const [planDrawingUrl, setPlanDrawingUrl] = useState(null);
  const [planTableRows, setPlanTableRows] = useState([]);
  const [planViewTitle, setPlanViewTitle] = useState('');
  const [planViewMeta, setPlanViewMeta] = useState(null);
  const [measureModalOpen, setMeasureModalOpen] = useState(false);
  const [measureModalLoading, setMeasureModalLoading] = useState(false);
  const [measureRows, setMeasureRows] = useState([]);
  const [measureQtyOptions, setMeasureQtyOptions] = useState([{ value: 1, label: 'Qty 1' }]);
  const [measureQty, setMeasureQty] = useState(1);
  const [measureContext, setMeasureContext] = useState(null);

  useEffect(() => {
    const oid = effectiveOrderId;
    if (oid && String(oid) !== 'null') {
      const checkOrderStatus = async () => {
        setIsCheckingStatus(true);
        try {
          const res = await axios.get(`${QUALITY_API_BASE_URL}/scheduling/order-status/${oid}`);
          setOrderStatus(res.data.order_status);
        } catch (error) {
          console.error("Error checking order status:", error);
          setOrderStatus('error');
        } finally {
          setIsCheckingStatus(false);
        }
      };
      checkOrderStatus();
    } else {
      setOrderStatus('active'); // No order ID means general access or handled by PDM
      setIsCheckingStatus(false);
    }
  }, [effectiveOrderId]);

  useEffect(() => {
    if (selectedItem && selectedItem.itemType === 'part') {
      fetchDetails(selectedItem);
    } else {
      setOperations([]);
      setPartDocuments([]);
      setInspectionPlanByOp({});
      setPreviewUrl(null);
      setPreviewModalVisible(false);
    }
  }, [selectedItem, effectiveOrderId]);

  const parseOpNo = (record) => {
    const n = Number(String(record?.operation_number ?? '').trim());
    return Number.isFinite(n) ? n : 10;
  };

  const fetchDetails = async (item) => {
    const partId = item.id;
    setLoadingDetails(true);
    try {
      const [opsRes, docsRes] = await Promise.all([
        axios.get(`${QUALITY_API_BASE_URL}/operations/part/${partId}`),
        axios.get(`${QUALITY_API_BASE_URL}/documents/part/${partId}`)
      ]);
      const ops = opsRes.data || [];
      const docs = docsRes.data || [];
      setOperations(ops);
      setPartDocuments(docs);

      const oid = effectiveOrderId && String(effectiveOrderId) !== 'null' ? Number(effectiveOrderId) : null;
      const pn = item.part_number;
      if (oid && !Number.isNaN(oid) && pn) {
        try {
          const ps = await axios.get(`${QUALITY_API_BASE_URL}/quality/inspection-plan-status`, {
            params: { part_number: pn, sales_order_id: oid },
          });
          const map = {};
          (Array.isArray(ps.data) ? ps.data : []).forEach((r) => {
            if (r && r.op_no != null) map[r.op_no] = r.status;
          });
          setInspectionPlanByOp(map);
        } catch {
          setInspectionPlanByOp({});
        }
      } else {
        setInspectionPlanByOp({});
      }
      
      // Auto-set the first part 2D drawing as default preview
      const partDrawing = docs.find(d => d.document_type?.toLowerCase().includes('2d'));
      if (partDrawing) {
        setPreviewUrl(partDrawing.document_url);
        setPreviewIsPdf(partDrawing.document_url?.toLowerCase().endsWith('.pdf'));
      }
    } catch (error) {
      console.error("Error fetching details:", error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const getDrawingInfo = (op) => {
    const isDrawing = (d) => {
      if (!d) return false;
      const type = (d.document_type || "").toLowerCase();
      const name = (d.document_name || "").toLowerCase();
      const isPdfFile = name.toLowerCase().endsWith('.pdf') || type.includes('pdf');
      return type.includes('2d') || type.includes('drawing') || name.includes('drawing') || isPdfFile || name.includes('.png') || name.includes('.jpg') || name.includes('.jpeg');
    };

    const partDrawing = partDocuments.find(isDrawing);
    const opDrawing = op.operation_documents?.find(isDrawing);
    const previewDrawing = opDrawing || partDrawing || op.operation_documents?.[0] || partDocuments[0];

    if (!previewDrawing) return { url: null, isPdf: false, name: '', apiDocumentId: null };

    const isPdf =
      (previewDrawing.document_name || "").toLowerCase().endsWith('.pdf') ||
      (previewDrawing.document_type || "").toLowerCase().includes('pdf');

    const endpoint = previewDrawing.operation_id != null ? 'operation-documents' : 'documents';

    const apiDocumentId = partDrawing?.id ?? previewDrawing.id;

    return {
      url: `${QUALITY_API_BASE_URL}/${endpoint}/${previewDrawing.id}/preview`,
      isPdf,
      name: previewDrawing.document_name,
      apiDocumentId,
    };
  };

  const handlePreviewOperation = (op) => {
    setPreviewTitle(`Operation ${op.operation_number}: ${op.operation_name}`);
    const { url, isPdf } = getDrawingInfo(op);
    setPreviewUrl(url);
    setPreviewIsPdf(isPdf);
    setPreviewModalVisible(true);
  };

  const openConfirmedPlanModal = async (record, opNo) => {
    const oid = effectiveOrderId && String(effectiveOrderId) !== 'null' ? Number(effectiveOrderId) : null;
    const partNo = selectedItem?.part_number;
    if (!oid || !partNo) {
      message.error('Order and part are required to view the confirmed plan.');
      return;
    }
    setPlanViewTitle(`Operation ${record.operation_number}: ${record.operation_name}`);
    setPlanViewMeta({
      opNo: record.operation_number,
      opName: record.operation_name,
      partNo: selectedItem?.part_number || '',
      orderNo: effectiveOrderId ? String(effectiveOrderId) : '',
    });
    setPlanViewOpen(true);
    setPlanViewLoading(true);
    try {
      const [docsRes, bocRes] = await Promise.all([
        axios.get(`${QUALITY_API_BASE_URL}/operation-documents/operation/${record.id}`),
        axios.get(`${QUALITY_API_BASE_URL}/quality/master-boc`, {
          params: { part_id: partNo, sales_order_id: oid, op_no: opNo },
        }),
      ]);
      const docs = Array.isArray(docsRes.data) ? docsRes.data : [];
      const baloonDoc = docs
        .filter((d) => String(d?.document_type || '').trim().toUpperCase() === 'BALOON')
        .sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0))[0];
      setPlanDrawingUrl(baloonDoc ? `${QUALITY_API_BASE_URL}/operation-documents/${baloonDoc.id}/preview` : null);
      setPlanTableRows(Array.isArray(bocRes.data) ? bocRes.data : []);
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail;
      message.error(typeof detail === 'string' ? detail : err.message || 'Failed to load confirmed plan');
      setPlanDrawingUrl(null);
      setPlanTableRows([]);
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
    a.download = `operation_${planViewMeta?.opNo || 'plan'}_balloon`;
    a.click();
  };

  const parseNum = (value) => {
    if (value == null) return null;
    const n = Number(String(value).replace(',', '.').trim());
    return Number.isFinite(n) ? n : null;
  };

  const fmt4 = (value) => {
    const n = parseNum(value);
    return n == null ? '—' : n.toFixed(4);
  };

  const measureDecoratedRows = useMemo(() => {
    return (measureRows || []).map((r) => {
      const nominal = parseNum(r.nominal_value);
      const upper = parseNum(r.uppertol);
      const lower = parseNum(r.lowertol);
      const mean = parseNum(r.measured_mean);
      const upperLimit = nominal != null && upper != null ? nominal + upper : null;
      const lowerLimit = nominal != null && lower != null ? nominal + lower : null;
      const hasTolerance = Math.abs(upper || 0) > 1e-12 || Math.abs(lower || 0) > 1e-12;
      const withinTolerance =
        hasTolerance &&
        mean != null &&
        upperLimit != null &&
        lowerLimit != null &&
        mean <= upperLimit &&
        mean >= lowerLimit;
      const outOfTolerance = hasTolerance && mean != null && !withinTolerance;
      const status = !hasTolerance ? 'no_tolerance' : withinTolerance ? 'within' : outOfTolerance ? 'out' : 'pending';
      return { ...r, _upperLimit: upperLimit, _lowerLimit: lowerLimit, _status: status };
    });
  }, [measureRows]);

  const measureSummary = useMemo(() => {
    const total = measureDecoratedRows.length;
    const within = measureDecoratedRows.filter((r) => r._status === 'within').length;
    const out = measureDecoratedRows.filter((r) => r._status === 'out').length;
    const noTol = measureDecoratedRows.filter((r) => r._status === 'no_tolerance').length;
    const passRate = total ? ((within / total) * 100).toFixed(1) : '0.0';
    return { total, within, out, noTol, passRate };
  }, [measureDecoratedRows]);

  const openMeasurementsModal = async (record) => {
    const oid = effectiveOrderId && String(effectiveOrderId) !== 'null' ? Number(effectiveOrderId) : null;
    if (!oid) {
      message.error('Order is required to view measurements.');
      return;
    }
    const opNo = parseOpNo(record);
    setMeasureContext({
      opNo,
      opName: record?.operation_name || '',
      opId: record?.id,
      partId: selectedItem?.id,
      partNo: selectedItem?.part_number || '',
      orderId: oid,
    });
    setMeasureModalOpen(true);
    setMeasureRows([]);
    setMeasureQty(1);
    setMeasureModalLoading(true);
    try {
      let qtyMax = 1;
      try {
        const p = await axios.get(`${QUALITY_API_BASE_URL}/parts/${selectedItem.id}`);
        const q = Number(p.data?.qty);
        if (Number.isFinite(q) && q >= 1) qtyMax = Math.min(999, Math.floor(q));
      } catch {
        qtyMax = 1;
      }
      const qOpts = Array.from({ length: qtyMax }, (_, i) => ({ value: i + 1, label: `Qty ${i + 1}` }));
      setMeasureQtyOptions(qOpts);
      setMeasureQty(1);
      const res = await axios.get(`${QUALITY_API_BASE_URL}/quality/stage-inspection`, {
        params: { part_id: selectedItem.id, sale_order_id: oid, op_no: opNo, quantity_no: 1 },
      });
      setMeasureRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail;
      message.error(typeof detail === 'string' ? detail : err.message || 'Failed to load measurements');
      setMeasureRows([]);
    } finally {
      setMeasureModalLoading(false);
    }
  };

  useEffect(() => {
    if (!measureModalOpen || !measureContext?.partId || !measureContext?.orderId || !measureContext?.opNo) return;
    let cancelled = false;
    (async () => {
      try {
        setMeasureModalLoading(true);
        const res = await axios.get(`${QUALITY_API_BASE_URL}/quality/stage-inspection`, {
          params: {
            part_id: measureContext.partId,
            sale_order_id: measureContext.orderId,
            op_no: measureContext.opNo,
            quantity_no: measureQty,
          },
        });
        if (!cancelled) setMeasureRows(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        const detail = err.response?.data?.detail;
        message.error(typeof detail === 'string' ? detail : err.message || 'Failed to load quantity measurements');
        setMeasureRows([]);
      } finally {
        if (!cancelled) setMeasureModalLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [measureModalOpen, measureContext, measureQty]);

  const isGdtType = (value) => String(value || '').trim().toUpperCase().startsWith('GDT');
  const fmtTol = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '0';
    if (Math.abs(n) < 1e-9) return '0';
    return String(n);
  };

  const handlePreviewPart = () => {
    setPreviewTitle(`Part Drawing: ${selectedItem.part_name}`);
    
    const isDrawing = (d) => {
      const type = (d.document_type || "").toLowerCase();
      const name = (d.document_name || "").toLowerCase();
      return type.includes('2d') || type.includes('drawing') || name.includes('drawing') || name.includes('.pdf') || name.includes('.png') || name.includes('.jpg') || name.includes('.jpeg');
    };

    let drawing = partDocuments.find(isDrawing);

    // Final fallback for part drawing
    if (!drawing && partDocuments.length > 0) {
      drawing = partDocuments[0];
    }

    setPreviewUrl(drawing?.document_url || null);
    setPreviewIsPdf(drawing?.document_url?.toLowerCase().endsWith('.pdf') || false);
    setPreviewModalVisible(true);
  };

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setMobileDrawerOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleItemSelected = (item) => {
    setSelectedItem(item);
    if (isMobile) setMobileDrawerOpen(false);
  };

  const handleHierarchyLoaded = (productId, hierarchy) => {
    setProductHierarchies(prev => ({ ...prev, [productId]: hierarchy }));
  };

  const calculateStats = (productId) => {
    const hierarchy = productHierarchies[productId];
    if (!hierarchy) return { total: 0, inhouse: 0, outsource: 0 };

    const parts = [];
    const directParts = hierarchy.direct_parts || hierarchy.parts || [];
    parts.push(...directParts);
    
    const walkAssemblies = (assemblies) => {
      (assemblies || []).forEach((asm) => {
        if (asm?.parts) parts.push(...asm.parts);
        if (asm?.subassemblies) walkAssemblies(asm.subassemblies);
      });
    };
    walkAssemblies(hierarchy.assemblies || []);

    const inhouse = parts.filter(p => !String(p.part?.type_name || p.type_name || "").toLowerCase().includes("out")).length;
    const outsource = parts.length - inhouse;

    return { total: parts.length, inhouse, outsource };
  };

  const StatCard = ({ icon, label, value, color }) => (
    <Card size="small" style={{ border: '1px solid #f0f0f0', borderRadius: '8px' }}>
      <Space align="center">
        <div style={{ fontSize: '20px', color: color, display: 'flex' }}>{icon}</div>
        <div>
          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>{label}</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{value}</div>
        </div>
      </Space>
    </Card>
  );

  if (isCheckingStatus) {
    return (
      <div style={{ height: 'calc(100vh - 180px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
        <Space direction="vertical" align="center">
          <Spin size="large" />
          <Text type="secondary">Checking order status...</Text>
        </Space>
      </div>
    );
  }

  if (orderStatus !== 'active' && effectiveOrderId && String(effectiveOrderId) !== 'null') {
    return (
      <div style={{ height: 'calc(100vh - 180px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', borderRadius: '12px', border: '1px solid #f0f0f0', margin: '20px' }}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div style={{ textAlign: 'center' }}>
              <Title level={4} style={{ color: '#ff4d4f' }}>Order Inactive</Title>
              <Text type="secondary">
                This order is currently inactive and not available for Quality Management.<br />
                Please ensure the order is scheduled and activated in the PPS module.
              </Text>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ height: 'calc(100vh - 180px)', overflow: 'hidden' }}>
      <Layout style={{ height: "100%", background: "transparent" }}>
        {/* Mobile Toggle */}
        {isMobile && (
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setMobileDrawerOpen(true)}
            style={{ position: 'fixed', top: 120, left: 16, zIndex: 1001, background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
          />
        )}

        {/* Sidebar/BOM */}
        {!isMobile && (
          <Sider
            width="33%"
            theme="light"
            style={{
              borderRight: "1px solid #f0f0f0",
              overflow: 'auto',
              minWidth: 300,
              maxWidth: 500,
              height: '100%',
              borderRadius: '8px 0 0 8px'
            }}
          >
            <QualityManagementBOM
              onItemSelected={handleItemSelected}
              onHierarchyLoaded={handleHierarchyLoaded}
              initialProductId={effectiveProductId}
            />
          </Sider>
        )}

        {/* Mobile Drawer for BOM */}
        {isMobile && (
          <Drawer
            placement="left"
            onClose={() => setMobileDrawerOpen(false)}
            open={mobileDrawerOpen}
            width="85%"
            styles={{ body: { padding: 0 } }}
          >
            <QualityManagementBOM
              onItemSelected={handleItemSelected}
              onHierarchyLoaded={handleHierarchyLoaded}
              initialProductId={effectiveProductId}
            />
          </Drawer>
        )}

        {/* Main Content Area */}
        <Content style={{ 
          background: '#f8fafc', 
          padding: '24px', 
          overflow: 'auto',
          borderRadius: isMobile ? '8px' : '0 8px 8px 0'
        }}>
          {selectedItem ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <Title level={3} style={{ margin: 0 }}>
                  {selectedItem.itemType === 'product' ? selectedItem.product_name : 
                   selectedItem.itemType === 'assembly' ? selectedItem.assembly_name : 
                   selectedItem.part_name}
                  {selectedItem.itemType === 'part' && (
                    <Button 
                      type="link" 
                      icon={<EyeOutlined />} 
                      onClick={handlePreviewPart}
                      style={{ marginLeft: '12px' }}
                    >
                      View Part Drawing
                    </Button>
                  )}
                </Title>
                <Space>
                  <Tag color="blue">{selectedItem.itemType.toUpperCase()}</Tag>
                </Space>
              </div>

              {selectedItem.itemType === 'product' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                  {(() => {
                    const stats = calculateStats(selectedItem.id);
                    return (
                      <>
                        <StatCard icon={<ClusterOutlined />} label="Total Parts" value={stats.total} color="#1890ff" />
                        <StatCard icon={<ToolOutlined />} label="In-house Parts" value={stats.inhouse} color="#52c41a" />
                        <StatCard icon={<ShoppingCartOutlined />} label="Outsource Parts" value={stats.outsource} color="#faad14" />
                      </>
                    );
                  })()}
                </div>
              )}

              {selectedItem.itemType === 'part' && (
                <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #f0f0f0', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <Title level={4} style={{ margin: 0, color: '#1a3353' }}>Process Operations</Title>
                  </div>
                  
                  <Table 
                    loading={loadingDetails}
                    dataSource={operations}
                    rowKey="id"
                    pagination={false}
                    scroll={{ x: 'max-content' }}
                    columns={[
                      {
                        title: 'Op #',
                        dataIndex: 'operation_number',
                        key: 'operation_number',
                        width: 80,
                        render: val => <Text strong style={{ color: '#1890ff' }}>{val}</Text>
                      },
                      {
                        title: 'Operation Name',
                        dataIndex: 'operation_name',
                        key: 'operation_name',
                        render: val => <Text style={{ fontWeight: 500 }}>{val}</Text>
                      },
                      {
                        title: 'Plan status',
                        key: 'inspection_plan_status',
                        width: 120,
                        render: (_, record) => {
                          const opNo = parseOpNo(record);
                          const st = inspectionPlanByOp[opNo];
                          if (st === 'confirmed') {
                            return <Tag color="success" style={{ borderRadius: '12px' }}>Confirmed</Tag>;
                          }
                          if (st === 'draft') {
                            return <Tag color="processing" style={{ borderRadius: '12px' }}>Draft</Tag>;
                          }
                          return <Tag style={{ borderRadius: '12px' }}>—</Tag>;
                        },
                      },
                      {
                        title: 'Req qty',
                        dataIndex: 'required_quantity',
                        key: 'required_quantity',
                        align: 'center'
                      },
                      {
                        title: 'Comp qty',
                        dataIndex: 'completed_quantity',
                        key: 'completed_quantity',
                        align: 'center'
                      },
                      {
                        title: 'Acpt qty',
                        dataIndex: 'accepted_quantity',
                        key: 'accepted_quantity',
                        align: 'center'
                      },
                      {
                        title: 'Rej qty',
                        dataIndex: 'rejected_quantity',
                        key: 'rejected_quantity',
                        align: 'center'
                      },
                      {
                        title: 'Yield %',
                        dataIndex: 'yield_percentage',
                        key: 'yield_percentage',
                        align: 'center',
                        render: val => (
                          <Text style={{ color: val >= 95 ? '#52c41a' : val < 80 ? '#f5222d' : '#faad14', fontWeight: 'bold' }}>
                            {val ? `${val}%` : '0%'}
                          </Text>
                        )
                      },
                      {
                        title: 'Actions',
                        key: 'actions',
                        fixed: 'right',
                        render: (_, record) => {
                          const opNo = parseOpNo(record);
                          const st = inspectionPlanByOp[opNo];
                          const planLabel = st === 'confirmed' ? 'View Plan' : st === 'draft' ? 'Continue Plan' : 'Create Plan';
                          const PlanIcon = st === 'confirmed' ? EyeOutlined : BuildOutlined;
                          return (
                          <Space size="middle">
                            <Button 
                              size="small" 
                              type="primary" 
                              ghost 
                              icon={<PlanIcon />}
                              onClick={async () => {
                                if (st === 'confirmed') {
                                  await openConfirmedPlanModal(record, opNo);
                                  return;
                                }
                                const { url, isPdf, name, apiDocumentId } = getDrawingInfo(record);
                                const hierarchy = productHierarchies[selectedItem.productId];
                                const projectName = hierarchy?.product?.product_name || '';
                                const partName = selectedItem.part_name || '';
                                const opParts = [];
                                if (record.operation_number != null && record.operation_number !== '') opParts.push(String(record.operation_number));
                                if (record.operation_name) opParts.push(record.operation_name);
                                const opLabel = opParts.join(': ');
                                if (effectiveOrderId && String(effectiveOrderId) !== 'null' && selectedItem.part_number) {
                                  if (st !== 'confirmed') {
                                    try {
                                      await axios.put(`${QUALITY_API_BASE_URL}/quality/inspection-plan-status`, {
                                        part_number: selectedItem.part_number,
                                        sales_order_id: Number(effectiveOrderId),
                                        op_no: opNo,
                                        status: 'draft',
                                      });
                                      setInspectionPlanByOp((prev) => ({ ...prev, [opNo]: 'draft' }));
                                    } catch (err) {
                                      console.error(err);
                                      const detail = err.response?.data?.detail;
                                      message.error(typeof detail === 'string' ? detail : err.message || 'Could not start inspection plan');
                                      return;
                                    }
                                  }
                                }
                                const qs = new URLSearchParams({
                                  drawingUrl: url || '',
                                  isPdf: String(!!isPdf),
                                  fileName: name || '',
                                  projectName,
                                  partName,
                                  operationName: opLabel,
                                  partId: String(selectedItem.id),
                                  partNumber: selectedItem.part_number || '',
                                  operationNumber: String(record.operation_number ?? ''),
                                  operationId: String(record.id),
                                });
                                if (apiDocumentId != null) qs.set('documentId', String(apiDocumentId));
                                if (effectiveOrderId && String(effectiveOrderId) !== 'null') {
                                  qs.set('orderId', String(effectiveOrderId));
                                }
                                navigate(`${qmsInspectorBase}?${qs.toString()}`);
                              }}
                            >
                              {planLabel}
                            </Button>
                            <Button 
                              size="small" 
                              icon={<CheckCircleOutlined />} 
                              style={{ color: '#52c41a', borderColor: '#52c41a' }}
                              onClick={() => openMeasurementsModal(record)}
                            >
                              Measurements
                            </Button>
                            <Button 
                              size="small" 
                              icon={<EyeOutlined />} 
                              onClick={() => handlePreviewOperation(record)}
                              title="View Drawing"
                            >
                              View Drawing
                            </Button>
                          </Space>
                          );
                        },
                      },
                    ]}
                  />
                </div>
              )}

              <Modal
                title={planViewTitle || 'Operation Details'}
                centered
                footer={null}
                width="95%"
                onCancel={() => setPlanViewOpen(false)}
                open={planViewOpen}
                styles={{ body: { padding: 12, height: '80vh', background: '#f7f8fa' } }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: 14, height: '100%', fontFamily: '"JetBrains Mono", "Consolas", "Courier New", monospace' }}>
                  <div style={{ border: '1px solid #dfe4ea', borderRadius: 10, overflow: 'hidden', background: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 10px rgba(15,23,42,0.04)' }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #eef0f3', background: '#fafbfc' }}>
                      <Text strong style={{ color: '#111827', fontSize: 22, lineHeight: 1.2, fontFamily: '"JetBrains Mono", "Consolas", "Courier New", monospace' }}>Inspection Details</Text>
                      <div style={{ marginTop: 10, fontSize: 16, color: '#374151' }}>
                        <Text style={{ fontSize: 16, fontFamily: '"JetBrains Mono", "Consolas", "Courier New", monospace' }}><b>Order:</b> {planViewMeta?.orderNo || '—'}</Text>
                        <Text style={{ fontSize: 16, marginLeft: 18, fontFamily: '"JetBrains Mono", "Consolas", "Courier New", monospace' }}><b>Part:</b> {planViewMeta?.partNo || '—'}</Text>
                        <Text style={{ fontSize: 16, marginLeft: 18, fontFamily: '"JetBrains Mono", "Consolas", "Courier New", monospace' }}><b>Operation:</b> {planViewMeta?.opNo || '—'}</Text>
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
                        rowClassName={(_, idx) => (idx % 2 === 0 ? 'plan-row-even' : 'plan-row-odd')}
                        columns={[
                          { title: 'S.No', key: 'sno', width: 82, render: (_, __, idx) => <Text style={{ fontFamily: '"JetBrains Mono", "Consolas", "Courier New", monospace', fontSize: 13 }}>{idx + 1}</Text> },
                          { title: 'Zone', dataIndex: 'zone', key: 'zone', width: 90, render: (z) => <Tag color="geekblue" style={{ margin: 0, borderRadius: 10, fontFamily: '"JetBrains Mono", "Consolas", "Courier New", monospace' }}>{z || '—'}</Tag> },
                          {
                            title: 'Description',
                            dataIndex: 'dimension_type',
                            key: 'dimension_type',
                            width: 280,
                            render: (val) => {
                              const gdt = isGdtType(val);
                              return (
                                <Tag
                                  color={gdt ? 'purple' : 'cyan'}
                                  style={{ margin: 0, borderRadius: 10, fontFamily: '"JetBrains Mono", "Consolas", "Courier New", monospace' }}
                                >
                                  {val || '—'}
                                </Tag>
                              );
                            },
                          },
                          { title: 'Nominal', dataIndex: 'nominal', key: 'nominal', width: 130, render: (v) => <Text style={{ fontFamily: '"JetBrains Mono", "Consolas", "Courier New", monospace', color: '#1f2937', fontSize: 13 }}>{v ?? '—'}</Text> },
                          { title: 'Upper Tol', dataIndex: 'uppertol', key: 'uppertol', width: 130, render: (v) => <Text style={{ fontFamily: '"JetBrains Mono", "Consolas", "Courier New", monospace', color: Number(v) > 0 ? '#15803d' : '#6b7280', fontSize: 13 }}>{fmtTol(v)}</Text> },
                          { title: 'Lower Tol', dataIndex: 'lowertol', key: 'lowertol', width: 130, render: (v) => <Text style={{ fontFamily: '"JetBrains Mono", "Consolas", "Courier New", monospace', color: Number(v) < 0 ? '#b91c1c' : '#6b7280', fontSize: 13 }}>{fmtTol(v)}</Text> },
                        ]}
                      />
                    </div>
                  </div>
                  <div style={{ border: '1px solid #dfe4ea', borderRadius: 10, overflow: 'hidden', background: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 10px rgba(15,23,42,0.04)' }}>
                    <div style={{ padding: '10px 14px', borderBottom: '1px solid #eef0f3', background: '#fafbfc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text strong style={{ color: '#111827', fontFamily: '"JetBrains Mono", "Consolas", "Courier New", monospace' }}>Drawing View</Text>
                      <Button size="small" icon={<CloudDownloadOutlined />} onClick={handleDownloadPlanDrawing} disabled={!planDrawingUrl}>
                        Download Drawing
                      </Button>
                    </div>
                    <div style={{ flex: 1, minHeight: 0, padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
                      {planViewLoading ? (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin /></div>
                      ) : planDrawingUrl ? (
                        <img
                          src={planDrawingUrl}
                          alt="Ballooned drawing"
                          style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain',
                            border: '1px solid #e5e7eb',
                            borderRadius: 10,
                            background: '#fff',
                            boxShadow: '0 2px 10px rgba(15,23,42,0.08)',
                          }}
                        />
                      ) : (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Empty description="No BALOON drawing found for this operation" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Modal>

              {/* Modal for 2D Drawing Preview */}
              <Modal
                title={`Measured Inspection Data${measureContext?.opNo != null ? ` - OP ${measureContext.opNo}` : ''}`}
                centered
                footer={null}
                width="96%"
                onCancel={() => setMeasureModalOpen(false)}
                open={measureModalOpen}
                styles={{ body: { padding: 12, maxHeight: '78vh', background: '#f7f8fa', fontFamily: '"JetBrains Mono", "Consolas", "Courier New", monospace', overflow: 'auto' } }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <Text style={{ fontFamily: '"JetBrains Mono", "Consolas", "Courier New", monospace' }}><b>Production Order:</b> {measureContext?.orderId || '—'}</Text>
                      <Text style={{ fontFamily: '"JetBrains Mono", "Consolas", "Courier New", monospace' }}><b>Part Number:</b> {measureContext?.partNo || '—'}</Text>
                      <Text style={{ fontFamily: '"JetBrains Mono", "Consolas", "Courier New", monospace' }}><b>Operation:</b> {measureContext?.opName ? `OP ${measureContext?.opNo} (${measureContext.opName})` : `OP ${measureContext?.opNo ?? '—'}`}</Text>
                    </div>
                    <Space align="center">
                      <Text style={{ fontFamily: '"JetBrains Mono", "Consolas", "Courier New", monospace' }}><b>Qty:</b></Text>
                      <Select
                        size="small"
                        style={{ width: 110 }}
                        value={measureQty}
                        options={measureQtyOptions}
                        onChange={setMeasureQty}
                      />
                    </Space>
                  </div>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', overflow: 'hidden' }}>
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid #eef0f3', background: '#fafbfc', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Tag color="default" style={{ margin: 0, borderRadius: 12 }}>Total: {measureSummary.total}</Tag>
                      <Tag color="success" style={{ margin: 0, borderRadius: 12 }}>Within Tol: {measureSummary.within}</Tag>
                      <Tag color="error" style={{ margin: 0, borderRadius: 12 }}>Out Tol: {measureSummary.out}</Tag>
                      <Tag color="processing" style={{ margin: 0, borderRadius: 12 }}>No Tol: {measureSummary.noTol}</Tag>
                      <Tag color="blue" style={{ margin: 0, borderRadius: 12 }}>Pass Rate: {measureSummary.passRate}%</Tag>
                    </div>
                    <Table
                      size="small"
                      loading={measureModalLoading}
                      dataSource={measureDecoratedRows}
                      rowKey="id"
                      pagination={{ pageSize: 10, showSizeChanger: false, hideOnSinglePage: true }}
                      scroll={{ x: 'max-content', y: Math.min(480, Math.max(160, measureDecoratedRows.length * 44 + 70)) }}
                      columns={[
                        { title: 'S.No', key: 'sno', width: 70, render: (_, __, idx) => idx + 1 },
                        { title: 'Zone', dataIndex: 'zone', key: 'zone', width: 90, render: (z) => <Tag color="geekblue" style={{ margin: 0, borderRadius: 10 }}>{z || '—'}</Tag> },
                        {
                          title: 'Type',
                          dataIndex: 'dimension_type',
                          key: 'dimension_type',
                          width: 170,
                          render: (v) => {
                            const gdt = String(v || '').trim().toUpperCase().startsWith('GDT');
                            return <Tag color={gdt ? 'purple' : 'cyan'} style={{ margin: 0, borderRadius: 10 }}>{v || '—'}</Tag>;
                          },
                        },
                        { title: 'Nominal', dataIndex: 'nominal_value', key: 'nominal_value', width: 110, render: (v) => <Text strong>{v ?? '—'}</Text> },
                        { title: 'Upper', dataIndex: 'uppertol', key: 'uppertol', width: 90, render: (v) => <Text style={{ color: Number(v) > 0 ? '#15803d' : '#6b7280' }}>{fmtTol(v)}</Text> },
                        { title: 'Lower', dataIndex: 'lowertol', key: 'lowertol', width: 90, render: (v) => <Text style={{ color: Number(v) < 0 ? '#b91c1c' : '#6b7280' }}>{fmtTol(v)}</Text> },
                        {
                          title: 'Upper Limit',
                          key: 'upper_limit',
                          width: 120,
                          render: (_, r) => <Text style={{ color: '#166534' }}>{fmt4(r._upperLimit)}</Text>,
                        },
                        {
                          title: 'Lower Limit',
                          key: 'lower_limit',
                          width: 120,
                          render: (_, r) => <Text style={{ color: '#991b1b' }}>{fmt4(r._lowerLimit)}</Text>,
                        },
                        { title: '#1', dataIndex: 'measured_1', key: 'measured_1', width: 90 },
                        { title: '#2', dataIndex: 'measured_2', key: 'measured_2', width: 90 },
                        { title: '#3', dataIndex: 'measured_3', key: 'measured_3', width: 90 },
                        {
                          title: 'Mean',
                          dataIndex: 'measured_mean',
                          key: 'measured_mean',
                          width: 110,
                          render: (v, r) => {
                            if (r._status === 'within') return <Text strong style={{ color: '#15803d' }}>{v || '—'}</Text>;
                            if (r._status === 'out') return <Text strong style={{ color: '#dc2626' }}>{v || '—'}</Text>;
                            return <Text style={{ color: '#4b5563' }}>{v || '—'}</Text>;
                          },
                        },
                        {
                          title: 'Status',
                          key: 'status',
                          width: 130,
                          render: (_, r) => {
                            if (r._status === 'within') return <Tag color="success" style={{ margin: 0, borderRadius: 10 }}>Within Tol</Tag>;
                            if (r._status === 'out') return <Tag color="error" style={{ margin: 0, borderRadius: 10 }}>Out Tol</Tag>;
                            if (r._status === 'no_tolerance') return <Tag color="processing" style={{ margin: 0, borderRadius: 10 }}>No Tol</Tag>;
                            return <Tag style={{ margin: 0, borderRadius: 10 }}>Pending</Tag>;
                          },
                        },
                      ]}
                    />
                  </div>
                </div>
              </Modal>

              {/* Modal for 2D Drawing Preview */}
              <Modal
                title={previewTitle || "Drawing Preview"}
                centered
                footer={null}
                width="90%"
                onCancel={() => setPreviewModalVisible(false)}
                open={previewModalVisible}
                styles={{ body: { padding: 0, height: '80vh' } }}
              >
                <div style={{ width: '100%', height: '100%', background: '#fff' }}>
                  {previewUrl ? (
                    previewIsPdf ? (
                      <iframe 
                        src={`${previewUrl}#toolbar=0`} 
                        width="100%" 
                        height="100%" 
                        style={{ border: 'none' }}
                        title="Drawing PDF"
                      />
                    ) : (
                      <img 
                        src={previewUrl} 
                        alt="Drawing" 
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    )
                  ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Empty description="No drawing available" />
                    </div>
                  )}
                </div>
              </Modal>
            </div>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', background: '#fff', borderRadius: '12px', border: '1px solid #f0f0f0' }}>
              <Empty description={
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <Text type="secondary">No item selected</Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Choose a product or part from the sidebar to view quality details</Text>
                </div>
              } image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </div>
          )}
        </Content>
      </Layout>
    </div>
  );
};

export default QualityManagement;
