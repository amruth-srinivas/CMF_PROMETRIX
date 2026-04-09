import React, { useState, useEffect } from 'react';
import { Layout, Button, Modal, Table, Spin, Drawer } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeftOutlined, MenuOutlined, AppstoreOutlined, ShoppingCartOutlined, ClusterOutlined, ToolOutlined, InfoCircleOutlined, EyeOutlined, BuildOutlined, CheckCircleOutlined, CloudDownloadOutlined } from "@ant-design/icons";
import QualityManagementBOM from './QualityManagementBOM';
import { Card, Tag, Typography, Empty, Space } from 'antd';
import axios from 'axios';
import { QUALITY_API_BASE_URL } from '../Config/qualityconfig';

const { Sider, Content } = Layout;
const { Text, Title } = Typography;

const QualityManagement = ({ initialProductId, initialOrderId, fromOms }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const productIdFromQuery = searchParams.get('productId');
  const orderIdFromQuery = searchParams.get('orderId');
  const effectiveOrderId =
    initialOrderId && String(initialOrderId) !== 'null' && String(initialOrderId) !== ''
      ? initialOrderId
      : orderIdFromQuery || undefined;
  
  const effectiveProductId =
    initialProductId && String(initialProductId) !== 'null' && String(initialProductId) !== ''
      ? initialProductId
      : productIdFromQuery || undefined;
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
      fetchDetails(selectedItem.id);
    } else {
      setOperations([]);
      setPartDocuments([]);
      setPreviewUrl(null);
      setPreviewModalVisible(false);
    }
  }, [selectedItem]);

  const fetchDetails = async (partId) => {
    setLoadingDetails(true);
    try {
      const [opsRes, docsRes] = await Promise.all([
        axios.get(`${QUALITY_API_BASE_URL}/operations/part/${partId}`),
        axios.get(`${QUALITY_API_BASE_URL}/documents/part/${partId}`)
      ]);
      let ops = opsRes.data || [];
      const docs = docsRes.data || [];
      
      // Enrich operations with FTP status from the new bulk endpoint
      if (effectiveOrderId && ops.length > 0) {
        try {
          const statusRes = await axios.get(`${QUALITY_API_BASE_URL}/quality/ftp-status/order/${effectiveOrderId}`);
          const statuses = statusRes.data || {};
          ops = ops.map(op => {
            const opNumber = op.operation_number;
            const partNumber = selectedItem.part_number;
            const ipid = `PLAN_${effectiveOrderId}_${partNumber}_OP${opNumber}`;
            return {
              ...op,
              ftp_status: statuses[ipid]?.status || 'Pending'
            };
          });
        } catch (statusErr) {
          console.warn("Failed to fetch FTP statuses:", statusErr);
        }
      }

      setOperations(ops);
      setPartDocuments(docs);
      
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
    <div style={{ height: 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '12px', flexShrink: 0 }}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/supervisor/create-inspection-plan')}
          style={{ borderRadius: '6px', fontWeight: 500 }}
        >
          Back to Projects
        </Button>
      </div>
      <Layout style={{ flex: 1, background: "transparent", overflow: 'hidden', borderRadius: '8px', border: '1px solid #f0f0f0' }}>
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
                        title: 'FTP Status',
                        dataIndex: 'ftp_status',
                        key: 'ftp_status',
                        render: (status) => (
                          <Tag color={status === 'Completed' ? 'success' : 'processing'} style={{ borderRadius: '12px' }}>
                            {status || 'Pending'}
                          </Tag>
                        )
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
                        render: (_, record) => (
                          <Space size="middle">
                            <Button 
                              size="small" 
                              type="primary" 
                              ghost 
                              icon={record.ftp_status === 'Completed' ? <EyeOutlined /> : <BuildOutlined />}
                              onClick={() => {
                                const { url, isPdf, name, apiDocumentId } = getDrawingInfo(record);
                                const hierarchy = productHierarchies[selectedItem.productId];
                                const projectName = hierarchy?.product?.product_name || '';
                                const partName = selectedItem.part_name || '';
                                const opParts = [];
                                if (record.operation_number != null && record.operation_number !== '') opParts.push(String(record.operation_number));
                                if (record.operation_name) opParts.push(record.operation_name);
                                const opLabel = opParts.join(': ');
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
                                const currentPath = window.location.pathname;
                                const isSupervisor = currentPath.includes('/supervisor/');
                                const inspectorRoot = isSupervisor ? '/supervisor' : '/admin';
                                navigate(`${inspectorRoot}/qms-inspector?${qs.toString()}`);
                              }}
                            >
                              {record.ftp_status === 'Completed' ? 'View Plan' : 'Create Plan'}
                            </Button>
                            <Button 
                              size="small" 
                              icon={<CheckCircleOutlined />} 
                              style={{ color: '#52c41a', borderColor: '#52c41a' }}
                              onClick={() => Modal.info({
                                title: 'Redirecting to QMS - Inspection',
                                content: 'On clicking this you would be redirected to the QMS software where you can inspect and measure the operations and make a report on them.',
                                centered: true,
                              })}
                            >
                              Inspect
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
                        ),
                      },
                    ]}
                  />
                </div>
              )}

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
