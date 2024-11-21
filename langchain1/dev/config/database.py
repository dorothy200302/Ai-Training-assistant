from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker
import logging
import os
import sys
from urllib.parse import quote_plus

# Add the project root to Python path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MySQL configuration
DB_USER = "root"  # 请替换为你的MySQL用户名
DB_PASSWORD = "123456"  # 请替换为你的MySQL密码
DB_HOST = "localhost"  # MySQL主机地址
DB_PORT = "3306"  # MySQL端口
DB_NAME = "doc_generator"  # 数据库名称

# 构建MySQL URL
SQLALCHEMY_DATABASE_URL = f"mysql+pymysql://{DB_USER}:{quote_plus(DB_PASSWORD)}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
logger.info(f"Connecting to database at: {DB_HOST}:{DB_PORT}/{DB_NAME}")

# Create engine for MySQL
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_size=5,  # 连接池大小
    max_overflow=10,  # 超出连接池大小后可以创建的连接数
    pool_timeout=30,  # 连接池连接超时时间（秒）
    pool_recycle=1800,  # 连接在连接池中重置的时间（秒）
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    try:
        # Check if tables exist
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        
        if not existing_tables:
            logger.info("No existing tables found. Creating database schema...")
            # Import all models here to ensure they are registered with SQLAlchemy
            from dev.models.base import Base
            from dev.models.models import Users, Documents, Departments, Roles, Employees, Permissions, TrainingDocuments, Feedback, FileIndex
            from dev.models.generated_document import GeneratedDocument
            
            # Create all tables
            Base.metadata.create_all(bind=engine)
            logger.info("Database tables created successfully")
            
            # Initialize default data only for fresh database
            init_default_data()
        else:
            logger.info(f"Database already initialized with tables: {existing_tables}")
        
    except Exception as e:
        logger.error(f"Failed to initialize database: {str(e)}")
        raise

def init_default_data():
    """Initialize default data in the database"""
    try:
        db = SessionLocal()
        
        try:
            # Create default department if it doesn't exist
            from dev.models.models import Departments
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
            else:
                logger.info("Default department already exists")
            
            # Create default roles if they don't exist
            from dev.models.models import Roles
            default_roles = ["admin", "manager", "user"]
            roles_created = False
            for role_name in default_roles:
                role = db.query(Roles).filter(Roles.name == role_name).first()
                if not role:
                    role = Roles(
                        name=role_name,
                        description=f"{role_name.capitalize()} role"
                    )
                    db.add(role)
                    roles_created = True
            
            if roles_created:
                db.commit()
                logger.info("Created new default roles")
            else:
                logger.info("Default roles already exist")
            
            # Get admin role for admin user
            admin_role = db.query(Roles).filter(Roles.name == "admin").first()
            
            # Check if admin user exists
            from dev.models.models import Employees
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
                
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating default data: {str(e)}")
            raise
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Failed to initialize default data: {str(e)}")
        raise

# Initialize database tables
logger.info("Starting database initialization...")
init_db()
logger.info("Database initialization completed")