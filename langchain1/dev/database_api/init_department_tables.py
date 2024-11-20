from sqlalchemy.orm import Session
from dev.models.models import Departments, Roles
import logging

logger = logging.getLogger(__name__)

def init_departments(db: Session):
    """Initialize default departments"""
    try:
        # Check if departments already exist
        if db.query(Departments).first():
            logger.info("Departments already initialized")
            return
        
        # Default departments
        departments = [
            Departments(name="Human Resources", description="Manages employee relations and recruitment"),
            Departments(name="Engineering", description="Software development and technical operations"),
            Departments(name="Operations", description="Day-to-day business operations"),
            Departments(name="Management", description="Company leadership and strategic planning")
        ]
        
        db.add_all(departments)
        db.commit()
        logger.info("Successfully initialized departments")
        
    except Exception as e:
        logger.error(f"Error initializing departments: {str(e)}")
        db.rollback()
        raise

def init_roles(db: Session):
    """Initialize default roles"""
    try:
        # Check if roles already exist
        if db.query(Roles).first():
            logger.info("Roles already initialized")
            return
        
        # Default roles
        roles = [
            Roles(name="admin", description="Full system access and control"),
            Roles(name="manager", description="Department management and oversight"),
            Roles(name="user", description="Basic system access")
        ]
        
        db.add_all(roles)
        db.commit()
        logger.info("Successfully initialized roles")
        
    except Exception as e:
        logger.error(f"Error initializing roles: {str(e)}")
        db.rollback()
        raise

def init_department_tables(db: Session):
    """Initialize all department-related tables"""
    try:
        init_departments(db)
        init_roles(db)
        logger.info("Successfully initialized all department tables")
        
    except Exception as e:
        logger.error(f"Error during department tables initialization: {str(e)}")
        raise
