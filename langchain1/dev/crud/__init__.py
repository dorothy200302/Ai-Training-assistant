from .crud_user import user_crud
from .crud_document import document_crud
from .crud_employee import employee_crud

# Export all CRUD instances
__all__ = [
    "user_crud",
    "document_crud",
    "employee_crud"
]
