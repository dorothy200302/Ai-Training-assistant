from typing import List, Dict, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from models.models import LearningProgress, Users, Documents
from fastapi import HTTPException

class ProgressService:
    def __init__(self, db: Session):
        self.db = db

    def update_progress(self,
        user_id: int,
        document_id: str,
        current_section: str,
        progress_percentage: float,
        completed: bool = False,
        quiz_scores: Optional[Dict] = None
    ) -> LearningProgress:
        """更新学习进度"""
        try:
            # 获取或创建进度记录
            progress = self.db.query(LearningProgress)\
                .filter(
                    LearningProgress.user_id == user_id,
                    LearningProgress.document_id == document_id
                ).first()

            if not progress:
                progress = LearningProgress(
                    user_id=user_id,
                    document_id=document_id
                )
                self.db.add(progress)

            # 更新进度信息
            progress.current_section = current_section
            progress.progress_percentage = progress_percentage
            progress.last_accessed = datetime.utcnow()
            
            if completed and not progress.completed:
                progress.completed = True
                progress.completion_date = datetime.utcnow()

            if quiz_scores:
                current_scores = progress.quiz_scores or {}
                current_scores.update(quiz_scores)
                progress.quiz_scores = current_scores

            self.db.commit()
            self.db.refresh(progress)

            return progress

        except Exception as e:
            self.db.rollback()
            raise HTTPException(status_code=500, detail=str(e))

    def get_user_progress(self, user_id: int) -> List[LearningProgress]:
        """获取用户的所有学习进度"""
        try:
            return self.db.query(LearningProgress)\
                .filter(LearningProgress.user_id == user_id)\
                .all()
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    def get_document_progress(self, document_id: str) -> List[LearningProgress]:
        """获取文档的所有学习进度记录"""
        try:
            return self.db.query(LearningProgress)\
                .filter(LearningProgress.document_id == document_id)\
                .all()
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    def get_team_progress(self, leader_id: int) -> List[Dict]:
        """获取团队的学习进度统计"""
        try:
            # 获取leader的下属
            subordinates = self.db.query(Users)\
                .filter(Users.leader_id == leader_id)\
                .all()

            team_progress = []
            for member in subordinates:
                progress_records = self.get_user_progress(member.user_id)
                
                # 计算统计数据
                completed_docs = sum(1 for p in progress_records if p.completed)
                avg_progress = sum(p.progress_percentage for p in progress_records) / len(progress_records) if progress_records else 0
                
                team_progress.append({
                    "user_id": member.user_id,
                    "name": member.username,
                    "completed_documents": completed_docs,
                    "total_documents": len(progress_records),
                    "average_progress": avg_progress,
                    "last_activity": max((p.last_accessed for p in progress_records), default=None)
                })

            return team_progress

        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    def get_quiz_statistics(self, document_id: str) -> Dict:
        """获取测验统计数据"""
        try:
            progress_records = self.get_document_progress(document_id)
            
            quiz_stats = {
                "total_attempts": 0,
                "average_score": 0,
                "highest_score": 0,
                "passing_rate": 0
            }

            if not progress_records:
                return quiz_stats

            scores = []
            for record in progress_records:
                if record.quiz_scores:
                    for score in record.quiz_scores.values():
                        scores.append(score)

            if scores:
                quiz_stats.update({
                    "total_attempts": len(scores),
                    "average_score": sum(scores) / len(scores),
                    "highest_score": max(scores),
                    "passing_rate": len([s for s in scores if s >= 60]) / len(scores) * 100
                })

            return quiz_stats

        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))