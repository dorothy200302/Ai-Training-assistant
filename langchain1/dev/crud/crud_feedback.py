from typing import List
from sqlalchemy.orm import Session
from dev.models.models import Feedback
from dev.crud.crud_base import CRUDBase

class CRUDFeedback(CRUDBase[Feedback]):
    def get_by_user_id(self, db: Session, user_id: int) -> List[Feedback]:
        return db.query(Feedback).filter(Feedback.user_id == user_id).all()
    
    def create_feedback(self, db: Session, feedback_data: dict) -> Feedback:
        return super().create(db, feedback_data)

feedback_crud = CRUDFeedback(Feedback) 