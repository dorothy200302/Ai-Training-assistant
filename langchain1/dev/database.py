from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import logging

# MySQL connection URL
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://root:123456@localhost:3306/doc_generator"

# Configure logging
logger = logging.getLogger(__name__)

try:
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=3600
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    logger.info("Successfully connected to MySQL database")
except Exception as e:
    logger.error(f"Failed to connect to database: {str(e)}")
    raise

# Import Base from models.base
from dev.models.base import Base

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
