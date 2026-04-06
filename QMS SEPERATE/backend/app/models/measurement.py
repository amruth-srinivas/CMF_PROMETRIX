"""
Measurement model for storing actual measurements linked to balloons.
"""
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text, func, Enum as SQLEnum
from sqlalchemy.orm import relationship
import enum
from app.database import Base


class GoNoGoStatus(str, enum.Enum):
    """Go/No-Go status enumeration."""
    GO = "GO"
    NO_GO = "NO_GO"


class Measurement(Base):
    """Measurement model - represents actual measurements for a balloon."""
    
    __tablename__ = "measurements"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Link to Balloon (required)
    balloon_id = Column(Integer, ForeignKey("balloons.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Link to Part (optional - for tracking which part instance)
    part_id = Column(Integer, ForeignKey("parts.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Quantity
    quantity = Column(Integer, nullable=True, default=1)  # Quantity of parts measured
    
    # Measurement values
    m1 = Column(Float, nullable=True)  # First measurement
    m2 = Column(Float, nullable=True)  # Second measurement
    m3 = Column(Float, nullable=True)  # Third measurement
    mean = Column(Float, nullable=True)  # Calculated mean of m1, m2, m3
    go_or_no_go = Column(SQLEnum(GoNoGoStatus), nullable=True)  # GO or NO_GO status
    
    # Metadata
    measured_by = Column(String(255), nullable=True)  # User/operator name
    measured_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    notes = Column(Text, nullable=True)  # Optional notes
    
    # Relationships
    balloon = relationship("Balloon", back_populates="measurements")
    part = relationship("Part", backref="measurements")

