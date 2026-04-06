"""
Project router with CRUD operations.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Dict, Any
from app.database import get_db
from app.models.project import Project
from app.models.assembly import Assembly
from app.models.part_location import PartLocation
from app.models.part import Part
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse, ProjectDetailResponse
from app.schemas.assembly import AssemblyResponse
from app.schemas.part import PartWithLocationResponse
from pydantic import BaseModel

router = APIRouter(prefix="/projects", tags=["projects"])


class ProjectCompletionValidation(BaseModel):
    """Schema for project completion validation response."""
    can_complete: bool
    incomplete_parts: List[Dict[str, Any]] = []
    message: str


@router.get("/{project_id}/validate-completion", response_model=ProjectCompletionValidation)
def validate_project_completion(project_id: int, db: Session = Depends(get_db)):
    """
    Validate if a project can be marked as complete.
    A project can be completed only if all its parts have inspection_plan_status = True.
    Returns the validation status and list of incomplete parts if any.
    """
    # Get project
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )
    
    # Get all assemblies for this project
    assemblies = db.query(Assembly).filter(Assembly.project_id == project_id).all()
    assembly_ids = [a.id for a in assemblies]
    
    # Get all parts for this project (both direct and through assemblies)
    # Parts directly linked to project
    project_parts = db.query(PartLocation).filter(
        PartLocation.project_id == project_id
    ).options(joinedload(PartLocation.part)).all()
    
    # Parts linked through assemblies
    assembly_parts = []
    if assembly_ids:
        assembly_parts = db.query(PartLocation).filter(
            PartLocation.assembly_id.in_(assembly_ids)
        ).options(joinedload(PartLocation.part)).all()
    
    # Combine all part locations
    all_part_locations = project_parts + assembly_parts
    
    # Check for incomplete parts
    incomplete_parts = []
    for pl in all_part_locations:
        if not pl.part.inspection_plan_status:
            incomplete_parts.append({
                "id": pl.part.id,
                "part_no": pl.part.part_no,
                "name": pl.part.name,
                "inspection_plan_status": pl.part.inspection_plan_status,
                "project_id": pl.project_id,
                "assembly_id": pl.assembly_id
            })
    
    can_complete = len(incomplete_parts) == 0
    message = (
        "All parts have completed inspection status. Project can be marked as complete."
        if can_complete else
        f"Project cannot be marked as complete. {len(incomplete_parts)} part(s) have incomplete inspection status."
    )
    
    return ProjectCompletionValidation(
        can_complete=can_complete,
        incomplete_parts=incomplete_parts,
        message=message
    )


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    """Create a new project."""
    db_project = Project(**project.model_dump())
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project


@router.get("/", response_model=List[ProjectResponse])
def list_projects(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List all projects with pagination."""
    projects = db.query(Project).offset(skip).limit(limit).all()
    return projects


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, db: Session = Depends(get_db)):
    """Get a project by ID."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    project_update: ProjectUpdate,
    db: Session = Depends(get_db)
):
    """Update a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )
    
    update_data = project_update.model_dump(exclude_unset=True)
    
    # If trying to mark project as complete, validate first
    if update_data.get("is_completed") is True:
        # Get all assemblies for this project
        assemblies = db.query(Assembly).filter(Assembly.project_id == project_id).all()
        assembly_ids = [a.id for a in assemblies]
        
        # Get all parts for this project (both direct and through assemblies)
        project_parts = db.query(PartLocation).filter(
            PartLocation.project_id == project_id
        ).options(joinedload(PartLocation.part)).all()
        
        assembly_parts = []
        if assembly_ids:
            assembly_parts = db.query(PartLocation).filter(
                PartLocation.assembly_id.in_(assembly_ids)
            ).options(joinedload(PartLocation.part)).all()
        
        all_part_locations = project_parts + assembly_parts
        
        # Check if all parts have completed inspection status
        incomplete_parts = [
            pl for pl in all_part_locations 
            if not pl.part.inspection_plan_status
        ]
        
        if incomplete_parts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot mark project as complete. {len(incomplete_parts)} part(s) have incomplete inspection status."
            )
    
    # Apply updates
    for field, value in update_data.items():
        setattr(project, field, value)
    
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: int, db: Session = Depends(get_db)):
    """Delete a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )
    
    db.delete(project)
    db.commit()
    return None


@router.get("/{project_id}/details", response_model=ProjectDetailResponse)
def get_project_details(project_id: int, db: Session = Depends(get_db)):
    """
    Get project details including all assemblies and parts.
    Returns project information with:
    - All assemblies in the project (with hierarchy)
    - All parts in the project (both directly linked and through assemblies)
    """
    # Get project
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )
    
    # Get all assemblies for this project
    assemblies = db.query(Assembly).filter(Assembly.project_id == project_id).all()
    assembly_responses = [
        {
            "id": a.id,
            "name": a.name,
            "no": getattr(a, "no", None),
            "rev": getattr(a, "rev", None),
            "project_id": a.project_id,
            "parent_assembly_id": a.parent_assembly_id,
            "created_at": a.created_at
        }
        for a in assemblies
    ]
    
    # Get all parts for this project
    # Parts can be linked directly to project or through assemblies
    # Get parts directly linked to project
    project_parts = db.query(PartLocation).filter(
        PartLocation.project_id == project_id
    ).options(joinedload(PartLocation.part)).all()
    
    # Get parts linked through assemblies in this project
    assembly_ids = [a.id for a in assemblies]
    assembly_parts = []
    if assembly_ids:
        assembly_parts = db.query(PartLocation).filter(
            PartLocation.assembly_id.in_(assembly_ids)
        ).options(joinedload(PartLocation.part)).all()
    
    # Combine all part locations
    all_part_locations = project_parts + assembly_parts
    
    # Build part responses with location info
    part_responses = []
    for pl in all_part_locations:
        part_data = {
            "id": pl.part.id,
            "part_no": pl.part.part_no,
            "name": pl.part.name,
            "rev": getattr(pl.part, "rev", None),
            "created_at": pl.part.created_at,
            "inspection_plan_status": getattr(pl.part, "inspection_plan_status", False),
            "priority_component": getattr(pl.part, "priority_component", False),
            "project_id": pl.project_id,
            "assembly_id": pl.assembly_id,
            "quantity": pl.quantity
        }
        part_responses.append(part_data)
    
    # Build response
    response_data = {
        "id": project.id,
        "project_number": project.project_number,
        "name": project.name,
        "customer_details": project.customer_details,
        "reference_no": project.reference_no,
        "created_at": project.created_at,
        "assemblies": assembly_responses,
        "parts": part_responses
    }
    
    return response_data

