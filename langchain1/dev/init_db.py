import sys
import os
import logging

# Add the parent directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.models import Base, Departments, Roles, Employees, Users
from models.generated_document import GeneratedDocument
from Chatbot.test_embeddings import SiliconFlowEmbeddings
from models.payment import Subscription

# SQLite configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SQLALCHEMY_DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'sql_app.db')}"

# Create engine for SQLite
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}  # Needed for SQLite
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

embeddings = SiliconFlowEmbeddings(
    api_key="sk-jfiddowyvulysbcxctumczcxqwiwtrfuldjgfvpwujtvncbg"
)

def init_db():
    try:
        # Create all tables
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
        
        # Initialize default data
        db = SessionLocal()
        try:
            # Create default department if it doesn't exist
            default_dept = db.query(Departments).filter(Departments.name == "General").first()
            if not default_dept:
                default_dept = Departments(
                    name="General",
                    description="General Department"
                )
                db.add(default_dept)
                db.commit()
                db.refresh(default_dept)
                logger.info("Created default department")
            
            # Create default roles if they don't exist
            default_roles = ["admin", "manager", "user"]
            for role_name in default_roles:
                role = db.query(Roles).filter(Roles.name == role_name).first()
                if not role:
                    role = Roles(
                        name=role_name,
                        description=f"{role_name.capitalize()} role"
                    )
                    db.add(role)
            db.commit()
            logger.info("Created default roles")
            
            # Get admin role for admin user
            admin_role = db.query(Roles).filter(Roles.name == "admin").first()
            
            # Check if admin user exists
            admin = db.query(Employees).filter(Employees.email == "admin@docgen.com").first()
            if not admin:
                # Create admin user
                from passlib.context import CryptContext
                pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
                
                admin = Employees(
                    name="Admin",
                    email="admin@docgen.com",
                    password_hash=pwd_context.hash("admin123"),
                    department_id=default_dept.id,  # Use default department
                    role_id=admin_role.id,  # Use admin role
                    status="active"
                )
                db.add(admin)
                db.commit()
                logger.info("Created default admin user")
                
            # Add default subscription
            default_sub = db.query(Subscription).filter(
                Subscription.user_email == "admin@docgen.com"
            ).first()
            
            if not default_sub:
                default_sub = Subscription(
                    user_email="admin@docgen.com",
                    plan_id="free",
                    usage_count=0
                )
                db.add(default_sub)
                db.commit()
                
        except Exception as e:
            logger.error(f"Failed to initialize default data: {str(e)}")
            db.rollback()
            raise
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Failed to initialize database: {str(e)}")
        raise

if __name__ == "__main__":
    # Drop all tables first
    Base.metadata.drop_all(bind=engine)
    logger.info("Dropped all existing tables")
    
    # Initialize database
    init_db()
    logger.info("Database initialized successfully!")
