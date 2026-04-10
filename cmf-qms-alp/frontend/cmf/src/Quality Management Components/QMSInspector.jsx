import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { App, Alert, Modal, Tabs } from 'antd';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { QUALITY_API_BASE_URL } from '../Config/qualityconfig';
import InspectorHeader from './InspectorComponents/InspectorHeader';
import InspectorSidebar from './InspectorComponents/InspectorSidebar';
import PdfInspectionPlanCanvas, { ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from './InspectorComponents/PdfInspectionPlanCanvas';
import InspectorBOCTable from './InspectorComponents/InspectorBOCTable';
import InspectorNotesTable from './InspectorComponents/InspectorNotesTable';
import StampCharacteristicModal from './InspectorComponents/StampCharacteristicModal';
import { parseNotesFromExtractedText } from './InspectorComponents/noteTextParser';

function toRectFromQuad(quad) {
  if (!Array.isArray(quad) || quad.length < 2) return null;
  try {
    const xs = quad.map((p) => Number(p?.[0])).filter(Number.isFinite);
    const ys = quad.map((p) => Number(p?.[1])).filter(Number.isFinite);
    if (!xs.length || !ys.length) return null;
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    const width = Math.max(...xs) - x;
    const height = Math.max(...ys) - y;
    if (width <= 0 || height <= 0) return null;
    return { x, y, width, height };
  } catch {
    return null;
  }
}

function overlapRatio(a, b) {
  const ix = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  const inter = ix * iy;
  const area = Math.max(1e-6, a.width * a.height);
  return inter / area;
}
import {
  buildBalloonOverlaysFromBocRows,
  mapDbMasterBocRowsToTable,
  parseMasterBocBboxToPdfRect,
  parseMasterBocIdFromStageBbox,
  pdfRectToQuad,
  withBalloonNumbers,
} from './InspectorComponents/bocMappers';
import { DEFAULT_MEASURED_INSTRUMENT } from './InspectorComponents/inspectorConstants';

const QMSInspector = () => {
  const { message } = App.useApp();
  const [searchParams] = useSearchParams();

  const drawingUrl = searchParams.get('drawingUrl');
  const documentId = searchParams.get('documentId');
  const partId = searchParams.get('partId');
  const partNumber = searchParams.get('partNumber');
  const orderId = searchParams.get('orderId');
  const opNumber = searchParams.get('operationNumber');
  const operationId = searchParams.get('operationId');
  const fileName = searchParams.get('fileName') || 'Drawing.pdf';
  const projectName = searchParams.get('projectName') || '';
  const partName = searchParams.get('partName') || '';
  const operationName = searchParams.get('operationName') || '';

  const fileUrl = drawingUrl || (documentId ? `${QUALITY_API_BASE_URL}/documents/${documentId}/preview` : null);

  const [quantityNo, setQuantityNo] = useState(() => {
    const q = searchParams.get('quantityNo');
    if (q != null && q !== '') {
      const n = Number(q);
      if (Number.isFinite(n) && n >= 1) return Math.floor(n);
    }
    return 1;
  });
  const [partQtyMax, setPartQtyMax] = useState(1);

  const [activeTool, setActiveTool] = useState('pan');
  const [pdfZoom, setPdfZoom] = useState(1);
  const [pdfRotation, setPdfRotation] = useState(0);
  const [bocRowsRaw, setBocRowsRaw] = useState([]);
  const [filterDimTypes, setFilterDimTypes] = useState([]);
  const [filterZones, setFilterZones] = useState([]);
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [lastClickedRowId, setLastClickedRowId] = useState(null);
  const [stampModalOpen, setStampModalOpen] = useState(false);
  const [pendingStampRegion, setPendingStampRegion] = useState(null);
  const [stampSaving, setStampSaving] = useState(false);

  const viewerWrapRef = useRef(null);
  const exportBalloonedRef = useRef(null);
  const quantityClearSkipRef = useRef(true);
  const [viewerWidth, setViewerWidth] = useState(880);
  const [viewerHeight, setViewerHeight] = useState(600);

  const ipid = 'AUTO';
  const [salesOrderId, setSalesOrderId] = useState(orderId && !Number.isNaN(Number(orderId)) ? Number(orderId) : undefined);
  const [opNo] = useState(() => {
    if (opNumber == null || opNumber === '') return 10;
    const n = Number(opNumber);
    return Number.isNaN(n) ? 10 : n;
  });
  const [saving, setSaving] = useState(false);
  /** null = unknown / no row; draft | confirmed from quality.inspection_plan_status */
  const [planStatus, setPlanStatus] = useState(null);
  const [inspectorMode, setInspectorMode] = useState('PLAN');
  const [stageRows, setStageRows] = useState([]);
  const [activeTab, setActiveTab] = useState('characteristics');
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);

  useLayoutEffect(() => {
    const el = viewerWrapRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth - 8;
      const h = el.clientHeight - 8;
      setViewerWidth(Math.max(320, w));
      setViewerHeight(Math.max(200, h));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fileUrl]);

  useEffect(() => {
    if (orderId && !Number.isNaN(Number(orderId))) setSalesOrderId(Number(orderId));
  }, [orderId]);

  useEffect(() => {
    const pid = partId ? Number(partId) : null;
    if (!pid) {
      setPartQtyMax(1);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(`${QUALITY_API_BASE_URL}/parts/${pid}`);
        const raw = res.data?.qty;
        const n = raw != null && Number(raw) >= 1 ? Math.min(999, Math.floor(Number(raw))) : 1;
        if (!cancelled) setPartQtyMax(n);
      } catch {
        if (!cancelled) setPartQtyMax(1);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [partId]);

  useEffect(() => {
    setQuantityNo((q) => Math.min(Math.max(1, q), partQtyMax));
  }, [partQtyMax]);

  const quantityOptions = useMemo(
    () =>
      Array.from({ length: partQtyMax }, (_, i) => ({
        value: i + 1,
        label: `Quantity ${i + 1}`,
      })),
    [partQtyMax],
  );

  const fetchMasterBoc = useCallback(async () => {
    const oid = Number(salesOrderId);
    if (!partNumber || !oid) {
      setBocRowsRaw([]);
      return;
    }
    try {
      const params = { part_id: partNumber, sales_order_id: oid };
      if (opNo != null && !Number.isNaN(opNo)) params.op_no = opNo;
      const res = await axios.get(`${QUALITY_API_BASE_URL}/quality/master-boc`, { params });
      setBocRowsRaw(mapDbMasterBocRowsToTable(res.data));
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail;
      message.error(typeof detail === 'string' ? detail : err.message || 'Failed to load characteristics');
    }
  }, [partNumber, salesOrderId, opNo, message]);

  useEffect(() => {
    void fetchMasterBoc();
  }, [fetchMasterBoc]);

  useEffect(() => {
    const oid = Number(salesOrderId);
    if (!partNumber || !oid) {
      setPlanStatus(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(`${QUALITY_API_BASE_URL}/quality/inspection-plan-status`, {
          params: { part_number: partNumber, sales_order_id: oid, op_no: opNo },
        });
        const row = Array.isArray(res.data) && res.data[0];
        if (!cancelled) setPlanStatus(row?.status || null);
      } catch {
        if (!cancelled) setPlanStatus(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [partNumber, salesOrderId, opNo]);

  const planLocked = planStatus === 'confirmed';

  const loadNotes = useCallback(async () => {
    const pid = partId ? Number(partId) : null;
    if (!pid) return;
    try {
      setNotesLoading(true);
      const res = await axios.get(`${QUALITY_API_BASE_URL}/quality/notes/part/${pid}`);
      setNotes(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.warn('Failed to load notes', err);
      setNotes([]);
    } finally {
      setNotesLoading(false);
    }
  }, [partId]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  /** Clear measurement rows when quantity changes (not on first mount) so values reset until ensure loads. */
  useEffect(() => {
    if (quantityClearSkipRef.current) {
      quantityClearSkipRef.current = false;
      return;
    }
    setStageRows([]);
    setSelectedRowIds([]);
    setLastClickedRowId(null);
  }, [quantityNo]);

  useEffect(() => {
    if (inspectorMode !== 'MEASURE') return;
    const pid = partId ? Number(partId) : null;
    const oid = Number(salesOrderId);
    if (!pid || !oid || !partNumber) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.post(`${QUALITY_API_BASE_URL}/quality/stage-inspection/ensure`, null, {
          params: {
            part_id: pid,
            part_number: partNumber,
            sale_order_id: oid,
            op_no: opNo,
            quantity_no: quantityNo,
            user_id: 1,
          },
        });
        if (!cancelled) setStageRows(res.data);
      } catch (err) {
        console.error(err);
        const detail = err.response?.data?.detail;
        if (!cancelled) {
          message.error(typeof detail === 'string' ? detail : err.message || 'Failed to load measure data');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [inspectorMode, partId, salesOrderId, opNo, partNumber, bocRowsRaw.length, quantityNo, message]);

  const handleMeasurePatch = useCallback(
    async (stageId, payload) => {
      if (!stageId) return;
      try {
        await axios.patch(`${QUALITY_API_BASE_URL}/quality/stage-inspection/${stageId}`, payload);
        setStageRows((prev) => prev.map((r) => (r.id === stageId ? { ...r, ...payload } : r)));
      } catch (err) {
        console.error(err);
        const detail = err.response?.data?.detail;
        message.error(typeof detail === 'string' ? detail : err.message || 'Failed to save measurement');
      }
    },
    [message],
  );

  const bocFiltered = useMemo(() => {
    return bocRowsRaw.filter((r) => {
      if (filterDimTypes.length && !filterDimTypes.includes(r.dimType)) return false;
      if (filterZones.length && !filterZones.includes(r.zone)) return false;
      return true;
    });
  }, [bocRowsRaw, filterDimTypes, filterZones]);

  const bocDisplay = useMemo(() => withBalloonNumbers(bocFiltered), [bocFiltered]);

  const stageByMasterId = useMemo(() => {
    const m = new Map();
    const wantQ = Number(quantityNo);
    for (const s of stageRows) {
      const rowQ = s.quantity_no != null ? Number(s.quantity_no) : 1;
      if (rowQ !== wantQ) continue;
      const mid = parseMasterBocIdFromStageBbox(s.bbox);
      if (mid != null) m.set(mid, s);
    }
    return m;
  }, [stageRows, quantityNo]);

  const bocTableData = useMemo(() => {
    return bocDisplay.map((r) => {
      const st = stageByMasterId.get(r.id);
      return {
        ...r,
        m1: st?.measured_1 ?? '',
        m2: st?.measured_2 ?? '',
        m3: st?.measured_3 ?? '',
        actualValue: st?.measured_mean ?? '',
        stageInspectionId: st?.id ?? null,
        measureLocked: Boolean(st?.is_done),
      };
    });
  }, [bocDisplay, stageByMasterId]);

  /** Drop selection for rows that disappeared (filters / reload). */
  useEffect(() => {
    const valid = new Set(bocTableData.map((r) => r.id));
    setSelectedRowIds((ids) => {
      const next = ids.filter((id) => valid.has(id));
      return next.length === ids.length ? ids : next;
    });
    setLastClickedRowId((id) => (id != null && valid.has(id) ? id : null));
  }, [bocTableData]);

  const handleSelectedIdsChange = useCallback((ids, lastId) => {
    setSelectedRowIds(ids);
    setLastClickedRowId(lastId ?? null);
  }, []);

  const handleDeleteSelectedRows = useCallback(() => {
    if (planLocked) {
      message.warning('Plan is confirmed. Characteristics cannot be deleted.');
      return;
    }
    if (!selectedRowIds.length) return;
    Modal.confirm({
      title: `Delete ${selectedRowIds.length} characteristic(s)?`,
      content: 'This removes the selected master BOC records (bbox) from the database.',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await Promise.all(
            selectedRowIds.map((id) => axios.delete(`${QUALITY_API_BASE_URL}/quality/master-boc/${id}`)),
          );
          message.success(`Removed ${selectedRowIds.length} characteristic(s).`);
          setSelectedRowIds([]);
          setLastClickedRowId(null);
          await fetchMasterBoc();
        } catch (err) {
          console.error(err);
          message.error(err.response?.data?.detail || err.message || 'Delete failed');
          throw err;
        }
      },
    });
  }, [selectedRowIds, fetchMasterBoc, message, planLocked]);

  useEffect(() => {
    const onKey = (e) => {
      if (planLocked) return;
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (!selectedRowIds.length) return;
      e.preventDefault();
      handleDeleteSelectedRows();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedRowIds, handleDeleteSelectedRows, planLocked]);

  const balloonOverlays = useMemo(() => buildBalloonOverlaysFromBocRows(bocDisplay), [bocDisplay]);

  const buildMasterBocItems = useCallback(
    (dimensions) =>
      dimensions.map((d) => {
        const nom = d.nominal_value != null && d.nominal_value !== '' ? String(d.nominal_value) : d.text || '';
        let ut = parseFloat(String(d.upper_tolerance || '0').replace(',', '.')) || 0;
        let lt = parseFloat(String(d.lower_tolerance || '0').replace(',', '.')) || 0;
        if (Number.isNaN(ut)) ut = 0;
        if (Number.isNaN(lt)) lt = 0;
        return {
          part_id: partNumber,
          sales_order_id: Number(salesOrderId),
          nominal: nom,
          uppertol: ut,
          lowertol: lt,
          zone: (d.zone || 'A1').toString().trim().toUpperCase(),
          dimension_type: d.dimension_type || 'Length',
          measured_instrument: DEFAULT_MEASURED_INSTRUMENT,
          op_no: opNo,
          bbox: JSON.stringify({ bbox: d.bbox, text: d.text, gdt_class: d.gdt_class, page: d.page || 1 }),
          ipid,
        };
      }),
    [partNumber, salesOrderId, opNo, ipid],
  );

  const detectZonesForBoxes = useCallback(
    async (boxes) => {
      const pid = partId ? Number(partId) : null;
      if (!pid || !documentId || !Array.isArray(boxes) || !boxes.length) return [];
      try {
        const res = await axios.post(`${QUALITY_API_BASE_URL}/pdf-annotation/extract-zones-bulk`, {
          part_id: pid,
          pdf_id: String(documentId),
          bounding_boxes: boxes,
          scale_factor: 1.0,
        });
        return Array.isArray(res.data?.zones) ? res.data.zones : [];
      } catch (err) {
        console.error(err);
        return [];
      }
    },
    [partId, documentId],
  );

  const detectZoneForRegion = useCallback(
    async (region) => {
      const pid = partId ? Number(partId) : null;
      if (!pid || !documentId || !region) return 'A1';
      try {
        const res = await axios.post(`${QUALITY_API_BASE_URL}/pdf-annotation/extract-zone`, {
          part_id: pid,
          pdf_id: String(documentId),
          bounding_box: region,
          scale_factor: 1.0,
        });
        return (res.data?.zone || 'A1').toString().trim().toUpperCase();
      } catch (err) {
        console.error(err);
        return 'A1';
      }
    },
    [partId, documentId],
  );

  const persistMasterBocDimensions = useCallback(
    async (dimensions) => {
      const oid = Number(salesOrderId);
      if (!oid || !partNumber || !dimensions?.length) return;
      setSaving(true);
      try {
        const items = buildMasterBocItems(dimensions);
        await axios.post(`${QUALITY_API_BASE_URL}/quality/master-boc/bulk`, { items, user_id: 1 });
        message.success(`Saved ${items.length} row(s) to Master BOC.`);
      } catch (err) {
        console.error(err);
        const detail = err.response?.data?.detail;
        message.error(typeof detail === 'string' ? detail : err.message || 'Save failed');
      } finally {
        setSaving(false);
      }
    },
    [salesOrderId, partNumber, buildMasterBocItems, message],
  );

  const onDetectionComplete = useCallback(
    async (data) => {
      if (planLocked) {
        message.warning('Plan is confirmed. Characteristics cannot be changed.');
        return;
      }
      const dims = Array.isArray(data?.dimensions) ? data.dimensions : [];
      const oid = Number(salesOrderId);
      if (dims.length) {
        const boxes = dims
          .map((d) => parseMasterBocBboxToPdfRect(JSON.stringify({ bbox: d.bbox, page: d.page || 1 })))
          .filter(Boolean);
        if (boxes.length === dims.length) {
          const zones = await detectZonesForBoxes(boxes);
          const byIdx = new Map(zones.map((z) => [z.index, (z.zone || 'A1').toString().trim().toUpperCase()]));
          for (let i = 0; i < dims.length; i += 1) {
            if (byIdx.has(i)) dims[i].zone = byIdx.get(i);
          }
        }
      }
      if (dims?.length && oid && partNumber) {
        await persistMasterBocDimensions(dims);
      }
      await fetchMasterBoc();
    },
    [planLocked, salesOrderId, partNumber, persistMasterBocDimensions, fetchMasterBoc, detectZonesForBoxes, message],
  );

  const handleStampRegion = useCallback(
    (region) => {
      if (planLocked) {
        message.warning('Plan is confirmed. Characteristics cannot be changed.');
        return;
      }
      setPendingStampRegion(region);
      setStampModalOpen(true);
    },
    [planLocked, message],
  );

  const handleStampModalOk = useCallback(
    async (formValues) => {
      if (planLocked) {
        message.warning('Plan is confirmed. Characteristics cannot be changed.');
        return;
      }
      const oid = Number(salesOrderId);
      if (!oid || !partNumber) {
        message.error('Order and part are required to save a stamped characteristic.');
        return;
      }
      const region = pendingStampRegion;
      if (!region) return;

      const quad = pdfRectToQuad(region.x, region.y, region.width, region.height);
      const nom = (formValues.nominal || '').toString().trim();
      let ut = parseFloat(String(formValues.uppertol ?? '0').replace(',', '.')) || 0;
      let lt = parseFloat(String(formValues.lowertol ?? '0').replace(',', '.')) || 0;
      if (Number.isNaN(ut)) ut = 0;
      if (Number.isNaN(lt)) lt = 0;
      const inst = (formValues.measured_instrument || DEFAULT_MEASURED_INSTRUMENT).toString().trim() || DEFAULT_MEASURED_INSTRUMENT;

      const item = {
        part_id: partNumber,
        sales_order_id: oid,
        nominal: nom,
        uppertol: ut,
        lowertol: lt,
        zone: await detectZoneForRegion(region),
        dimension_type: formValues.dimension_type || 'Length',
        measured_instrument: inst,
        op_no: opNo,
        bbox: JSON.stringify({ bbox: quad, text: nom, page: region.page }),
        ipid,
      };

      setStampSaving(true);
      try {
        await axios.post(`${QUALITY_API_BASE_URL}/quality/master-boc/bulk`, { items: [item], user_id: 1 });
        message.success('Stamped characteristic saved.');
        setStampModalOpen(false);
        setPendingStampRegion(null);
        await fetchMasterBoc();
      } catch (err) {
        console.error(err);
        const detail = err.response?.data?.detail;
        message.error(typeof detail === 'string' ? detail : err.message || 'Save failed');
      } finally {
        setStampSaving(false);
      }
    },
    [planLocked, salesOrderId, partNumber, pendingStampRegion, opNo, ipid, message, fetchMasterBoc, detectZoneForRegion],
  );

  const handleConfirmPlan = useCallback(() => {
    const oid = Number(salesOrderId);
    const operationPk = Number(operationId);
    if (!partNumber || !oid) {
      message.error('Order and part are required.');
      return;
    }
    if (!Number.isFinite(operationPk)) {
      message.error('Operation is required to store ballooned drawing.');
      return;
    }
    if (!bocRowsRaw.length) {
      message.warning('Add at least one characteristic before confirming the plan.');
      return;
    }
    Modal.confirm({
      title: 'Confirm inspection plan?',
      content:
        'After confirmation, the inspection plan is locked.',
      okText: 'Confirm',
      onOk: async () => {
        try {
          const exporter = exportBalloonedRef.current;
          if (typeof exporter !== 'function') {
            throw new Error('Drawing is still rendering. Please wait a moment and try again.');
          }
          const blob = await exporter();
          if (!blob) {
            throw new Error('Failed to capture ballooned drawing.');
          }
          const fd = new FormData();
          const safePart = (partNumber || 'part').replace(/[^a-zA-Z0-9_-]+/g, '_');
          const fileName = `${safePart}_op${opNo}_balloon.png`;
          fd.append('operation_id', String(operationPk));
          fd.append('document_type', 'BALOON');
          fd.append('document_version', '1.0');
          fd.append('files', new File([blob], fileName, { type: 'image/png' }));
          await axios.post(`${QUALITY_API_BASE_URL}/operation-documents/upload/`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });

          await axios.put(`${QUALITY_API_BASE_URL}/quality/inspection-plan-status`, {
            part_number: partNumber,
            sales_order_id: oid,
            op_no: opNo,
            status: 'confirmed',
          });
          setPlanStatus('confirmed');
          message.success('Inspection plan confirmed.');
        } catch (err) {
          console.error(err);
          const detail = err.response?.data?.detail;
          message.error(typeof detail === 'string' ? detail : err.message || 'Failed to confirm');
          throw err;
        }
      },
    });
  }, [partNumber, salesOrderId, operationId, opNo, bocRowsRaw.length, message]);

  useEffect(() => {
    if (!bocRowsRaw.length || !partId || !documentId || planLocked) return;
    let cancelled = false;
    (async () => {
      const withRects = bocRowsRaw
        .map((row) => ({ row, rect: parseMasterBocBboxToPdfRect(row._bbox) }))
        .filter((x) => x.rect);
      if (!withRects.length) return;
      const zones = await detectZonesForBoxes(withRects.map((x) => x.rect));
      if (cancelled || !zones.length) return;
      const zoneByIndex = new Map(zones.map((z) => [z.index, (z.zone || '').toString().trim().toUpperCase()]));
      const updates = [];
      for (let i = 0; i < withRects.length; i += 1) {
        const row = withRects[i]?.row;
        const newZone = zoneByIndex.get(i) || '';
        const oldZone = (row?.zone || '').toString().trim().toUpperCase();
        if (row?.id && newZone && newZone !== oldZone) {
          updates.push({ id: row.id, zone: newZone });
        }
      }
      if (!updates.length) return;
      await Promise.all(
        updates.map((u) => axios.patch(`${QUALITY_API_BASE_URL}/quality/master-boc/${u.id}`, { zone: u.zone })),
      );
      if (!cancelled) {
        await fetchMasterBoc();
        message.success(`Updated zones for ${updates.length} characteristic(s).`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bocRowsRaw, partId, documentId, detectZonesForBoxes, fetchMasterBoc, message, planLocked]);

  const handleToolChange = useCallback(
    (tool) => {
      if (planLocked && (tool === 'select' || tool === 'stamp')) {
        message.warning('Plan is confirmed. Use MEASURE mode to record results.');
        return;
      }
      setActiveTool(tool);
      if (tool === 'notes') setActiveTab('notes');
    },
    [planLocked, message],
  );

  useEffect(() => {
    if (planLocked && (activeTool === 'select' || activeTool === 'stamp')) {
      setActiveTool('pan');
    }
  }, [planLocked, activeTool]);

  const noteOverlays = useMemo(
    () =>
      notes
        .filter((n) => n?.x != null && n?.y != null && n?.width != null && n?.height != null)
        .map((n) => ({
          id: n.id,
          page: n.page || 1,
          pdfRect: { x: n.x, y: n.y, width: n.width, height: n.height },
        })),
    [notes],
  );

  const handleNoteRegion = useCallback(
    async (region) => {
      const pid = partId ? Number(partId) : null;
      if (!pid || !documentId) {
        message.error('Part or document is missing for notes.');
        return;
      }
      try {
        const textRes = await axios.post(`${QUALITY_API_BASE_URL}/pdf-annotation/extract-text`, {
          part_id: pid,
          pdf_id: String(documentId),
          bounding_box: region,
          scale_factor: 1.0,
        });
        const regionRect = { x: region.x, y: region.y, width: region.width, height: region.height };
        const filteredDetections = (textRes.data?.detections || []).filter((t) => {
          const quad = t.box || t.bbox;
          const r = toRectFromQuad(quad);
          const content = (t.text || t.content || t.value || '').trim();
          if (!content) return false;
          // If detector didn't return geometry, keep as fallback.
          if (!r) return true;
          const cx = r.x + r.width / 2;
          const cy = r.y + r.height / 2;
          const centerInside =
            cx >= regionRect.x &&
            cx <= regionRect.x + regionRect.width &&
            cy >= regionRect.y &&
            cy <= regionRect.y + regionRect.height;
          // Also allow strong overlap (for partially clipped words).
          const ov = overlapRatio(r, regionRect);
          return centerInside || ov >= 0.55;
        });
        const extractedText = filteredDetections.map((t) => t.text || t.content || t.value || '').filter(Boolean).join('\n');
        const noteItems = parseNotesFromExtractedText(extractedText);
        if (!noteItems.length) {
          noteItems.push(''); // keep region record even if OCR text is empty
        }
        await Promise.all(
          noteItems.map((noteText) =>
            axios.post(`${QUALITY_API_BASE_URL}/quality/notes`, {
              part_id: pid,
              document_id: Number(documentId),
              x: region.x,
              y: region.y,
              width: region.width,
              height: region.height,
              page: region.page,
              note_text: (noteText || '').trim(),
            }),
          ),
        );
        message.success('Note saved.');
        await loadNotes();
      } catch (err) {
        console.error(err);
        const detail = err.response?.data?.detail;
        message.error(typeof detail === 'string' ? detail : err.message || 'Failed to create note');
      }
    },
    [partId, documentId, loadNotes, message],
  );

  const handleZoomIn = useCallback(() => {
    setPdfZoom((z) => Math.min(ZOOM_MAX, Math.round((z + ZOOM_STEP) * 100) / 100));
  }, []);

  const handleZoomOut = useCallback(() => {
    setPdfZoom((z) => Math.max(ZOOM_MIN, Math.round((z - ZOOM_STEP) * 100) / 100));
  }, []);

  const handleRotate = useCallback(() => {
    setPdfRotation((r) => (r + 90) % 360);
  }, []);

  const handleResetView = useCallback(() => {
    setPdfZoom(1);
    setPdfRotation(0);
  }, []);

  const handleAutoBalloon = useCallback(() => {
    message.info('Auto Balloon is not connected yet — balloon numbering from geometry will run here.');
  }, [message]);

  const handleClearAll = useCallback(() => {
    if (planLocked) {
      message.warning('Plan is confirmed. Characteristics cannot be cleared.');
      return;
    }
    if (!bocRowsRaw.length) return;
    Modal.confirm({
      title: 'Clear all characteristics?',
      content: 'This removes every Master BOC row for this part, order, and operation from the database.',
      okText: 'Delete all',
      okType: 'danger',
      onOk: async () => {
        try {
          await Promise.all(
            bocRowsRaw.map((row) => axios.delete(`${QUALITY_API_BASE_URL}/quality/master-boc/${row.id}`)),
          );
          message.success('All characteristics removed.');
          setSelectedRowIds([]);
          setLastClickedRowId(null);
          await fetchMasterBoc();
        } catch (err) {
          console.error(err);
          message.error(err.response?.data?.detail || err.message || 'Delete failed');
        }
      },
    });
  }, [bocRowsRaw, fetchMasterBoc, message, planLocked]);

  const canDetect = Boolean(documentId && partId);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f8fafc' }}>
      <InspectorHeader
        fileName={fileName}
        projectName={projectName}
        partName={partName}
        operationName={operationName}
        mode={inspectorMode}
        onModeChange={setInspectorMode}
        planStatus={planStatus}
        onConfirmPlan={handleConfirmPlan}
        confirmPlanDisabled={!bocRowsRaw.length || !salesOrderId || !partNumber}
      />

      {/* Plain divs — Ant Sider's internal wrapper breaks flex height chains */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
        <InspectorSidebar
          activeTool={activeTool}
          onToolChange={handleToolChange}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onRotate={handleRotate}
          onResetView={handleResetView}
          onAutoBalloon={handleAutoBalloon}
          onClearAll={handleClearAll}
          clearAllDisabled={!bocRowsRaw.length}
          planEditLocked={planLocked}
        />

        {/* PDF viewer */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {!fileUrl && (
            <Alert type="error" message="No drawing URL. Open this page from Quality Management → Create Plan." showIcon />
          )}
          {!canDetect && activeTool === 'select' && fileUrl && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 12 }}
              message="Part-level PDF required for auto-detection"
              description="Use Stamp to add a characteristic manually, or link a part document for Select mode."
            />
          )}
          {fileUrl && (
            <div ref={viewerWrapRef} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <PdfInspectionPlanCanvas
                fileUrl={fileUrl}
                documentId={canDetect ? Number(documentId) : null}
                partId={partId ? Number(partId) : null}
                activeTool={activeTool}
                onDetectionComplete={onDetectionComplete}
                onStampRegion={handleStampRegion}
                onNoteRegion={handleNoteRegion}
                onExportBalloonedReady={(fn) => {
                  exportBalloonedRef.current = fn;
                }}
                loadingExternal={saving}
                zoom={pdfZoom}
                onZoomChange={setPdfZoom}
                pdfRotation={pdfRotation}
                maxDisplayWidth={viewerWidth}
                maxDisplayHeight={viewerHeight}
                balloonOverlays={balloonOverlays}
                noteOverlays={noteOverlays}
                selectedBalloonId={lastClickedRowId}
              />
            </div>
          )}
        </div>

        {/* Right panel — characteristics table */}
        <div
          style={{
            width: '42%',
            minWidth: 320,
            minHeight: 0,
            background: '#fff',
            borderLeft: '1px solid #f0f0f0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            padding: '12px 12px 0',
            fontFamily: '"JetBrains Mono", "Consolas", "Courier New", monospace',
          }}
        >
          <Tabs
            className="qms-inspector-tabs"
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'characteristics',
                label: 'Characteristics',
                children: (
                  <InspectorBOCTable
                    selectedIds={selectedRowIds}
                    onSelectedIdsChange={handleSelectedIdsChange}
                    onDeleteSelected={handleDeleteSelectedRows}
                    dataSource={bocTableData}
                    totalCount={bocRowsRaw.length}
                    optionSource={bocRowsRaw}
                    filterDimTypes={filterDimTypes}
                    filterZones={filterZones}
                    onFilterDimTypesChange={setFilterDimTypes}
                    onFilterZonesChange={setFilterZones}
                    measureMode={inspectorMode === 'MEASURE'}
                    onMeasurePatch={handleMeasurePatch}
                    quantityOptions={quantityOptions}
                    quantityNo={quantityNo}
                    onQuantityChange={setQuantityNo}
                    planEditLocked={planLocked}
                  />
                ),
              },
              {
                key: 'notes',
                label: 'Notes',
                children: (
                  <InspectorNotesTable
                    notes={notes}
                    loading={notesLoading}
                    onAddNote={async (noteText) => {
                      const pid = partId ? Number(partId) : null;
                      if (!pid || !documentId) return;
                      await axios.post(`${QUALITY_API_BASE_URL}/quality/notes`, {
                        part_id: pid,
                        document_id: Number(documentId),
                        x: 0,
                        y: 0,
                        width: 1,
                        height: 1,
                        page: 1,
                        note_text: noteText,
                      });
                      await loadNotes();
                    }}
                    onUpdateNote={async (noteId, noteText) => {
                      await axios.put(`${QUALITY_API_BASE_URL}/quality/notes/${noteId}`, { note_text: noteText });
                      await loadNotes();
                    }}
                    onDeleteNote={async (noteId) => {
                      await axios.delete(`${QUALITY_API_BASE_URL}/quality/notes/${noteId}`);
                      await loadNotes();
                    }}
                    onDeleteAll={async () => {
                      const pid = partId ? Number(partId) : null;
                      if (!pid) return;
                      await axios.delete(`${QUALITY_API_BASE_URL}/quality/notes/part/${pid}`);
                      await loadNotes();
                    }}
                  />
                ),
              },
            ]}
          />
        </div>
      </div>

      <StampCharacteristicModal
        open={stampModalOpen}
        onCancel={() => {
          setStampModalOpen(false);
          setPendingStampRegion(null);
        }}
        onOk={handleStampModalOk}
        confirmLoading={stampSaving}
        defaultInstrument={DEFAULT_MEASURED_INSTRUMENT}
      />
    </div>
  );
};

export default QMSInspector;
