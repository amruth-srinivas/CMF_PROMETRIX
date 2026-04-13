"""
Operator-facing QMS helpers: in-progress operations from scheduling service + local plan flags.
"""
import json
import os
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import exists
from sqlalchemy.orm import Session, joinedload

from DB.database import get_db
from DB.models.oms import OperationDocument, Order
from DB.models.quality import InspectionPlanStatus, MasterBoc

router = APIRouter(prefix="/operator", tags=["operator-qms"])

SCHEDULING_API_BASE_URL = os.getenv(
    "SCHEDULING_API_BASE_URL",
    "http://172.18.7.85:8989/api/v1",
).rstrip("/")


def _fetch_scheduling_inprogress(machine_id: int) -> Dict[str, Any]:
    url = f"{SCHEDULING_API_BASE_URL}/scheduling/inprogress-operations/{machine_id}"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        detail = e.read().decode() or str(e.reason)
        raise HTTPException(status_code=e.code if 400 <= e.code < 600 else 502, detail=detail)
    except urllib.error.URLError as e:
        raise HTTPException(status_code=502, detail=f"Scheduling service unreachable: {e.reason}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Scheduling service error: {e}")


def _parse_op_no(raw: Any) -> Optional[int]:
    if raw is None:
        return None
    try:
        s = str(raw).strip()
        if not s:
            return None
        return int(float(s))
    except (TypeError, ValueError):
        return None


def _has_inspection_plan(db: Session, part_number: str, order_id: int, op_no: Optional[int]) -> bool:
    if not part_number or not part_number.strip() or op_no is None:
        return False
    pn = part_number.strip()
    has_boc = db.query(
        exists().where(
            MasterBoc.part_id == pn,
            MasterBoc.sales_order_id == order_id,
            MasterBoc.op_no == op_no,
        )
    ).scalar()
    has_status = db.query(
        exists().where(
            InspectionPlanStatus.part_number == pn,
            InspectionPlanStatus.sales_order_id == order_id,
            InspectionPlanStatus.op_no == op_no,
        )
    ).scalar()
    return bool(has_boc or has_status)


def _first_operation_document(db: Session, operation_id: int) -> Optional[OperationDocument]:
    return (
        db.query(OperationDocument)
        .filter(OperationDocument.operation_id == operation_id)
        .order_by(OperationDocument.id.asc())
        .first()
    )


@router.get("/machine-inprogress/{machine_id}")
def get_machine_inprogress_with_plan(machine_id: int, db: Session = Depends(get_db)):
    """
    Proxies scheduling in-progress operations and adds has_inspection_plan and preview document hints.
    """
    data = _fetch_scheduling_inprogress(machine_id)
    operations: List[Dict[str, Any]] = list(data.get("operations") or [])
    enriched: List[Dict[str, Any]] = []

    for op in operations:
        order_id = op.get("order_id")
        part_number = op.get("part_number") or ""
        operation_id = op.get("operation_id")
        op_no = _parse_op_no(op.get("operation_number"))

        has_plan = False
        preview_document_id = None
        preview_endpoint: Optional[str] = None
        preview_document_name: Optional[str] = None
        project_name = None
        sale_order_number = None

        if order_id is not None:
            ord_row = (
                db.query(Order)
                .options(joinedload(Order.product))
                .filter(Order.id == order_id)
                .first()
            )
            if ord_row:
                sale_order_number = ord_row.sale_order_number
                if ord_row.product:
                    project_name = ord_row.product.product_name

        if isinstance(operation_id, int):
            doc = _first_operation_document(db, operation_id)
            if doc:
                preview_document_id = doc.id
                preview_endpoint = "operation-documents"
                preview_document_name = doc.document_name

        if isinstance(order_id, int) and part_number:
            has_plan = _has_inspection_plan(db, part_number, order_id, op_no)

        row = {**op}
        row["op_no"] = op_no
        row["has_inspection_plan"] = has_plan
        row["preview_document_id"] = preview_document_id
        row["preview_endpoint"] = preview_endpoint
        row["preview_document_name"] = preview_document_name
        row["project_name"] = project_name
        row["sale_order_number"] = sale_order_number
        enriched.append(row)

    return {
        "machine_id": data.get("machine_id", machine_id),
        "machine_name": data.get("machine_name"),
        "total_inprogress_operations": data.get("total_inprogress_operations", len(enriched)),
        "operations": enriched,
    }


class InspectionPlanRequestBody(BaseModel):
    machine_id: int = Field(..., description="Machine the operator is logged into")
    order_id: int
    part_id: int
    operation_id: int


@router.post("/request-inspection-plan")
def request_inspection_plan(body: InspectionPlanRequestBody):
    """
    Placeholder for notifying supervisors to create an inspection plan.
    Extend with persistence or notifications when available.
    """
    return {
        "status": "ok",
        "message": "Request recorded. A supervisor can create the inspection plan for this order and operation.",
        "machine_id": body.machine_id,
        "order_id": body.order_id,
        "part_id": body.part_id,
        "operation_id": body.operation_id,
    }
