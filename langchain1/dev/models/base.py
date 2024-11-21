from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import MetaData

# Create new MetaData instance
metadata = MetaData()
Base = declarative_base(metadata=metadata)
