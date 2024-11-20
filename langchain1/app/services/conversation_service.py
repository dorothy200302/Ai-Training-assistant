from typing import Dict, List, Optional
from ..models.conversation import ConversationSession
from ..models.user import User
from ..models.company import Company
from .answer_processor import AnswerProcessor
from .rag_service import RAGService

class ConversationService:
    def __init__(self):
        self.conversation_steps = [
            'company_info',
            'user_background',
            'training_needs',
            'document_requirements',
            'specific_requirements'
        ]
        
        self.questions = {
            'company_info': [
                {
                    'id': 'company_name',
                    'question': "请问贵公司的名称是？",
                    'type': 'text',
                    'required': True
                },
                {
                    'id': 'company_culture',
                    'question': "请描述贵公司的文化和价值观：",
                    'type': 'textarea',
                    'required': True
                },
                {
                    'id': 'industry_position',
                    'question': "贵公司在行业内的位置和主要竞争优势是什么？",
                    'type': 'textarea',
                    'required': True
                }
            ],
            'user_background': [
                {
                    'id': 'position',
                    'question': "您在组织中担任什么职位？",
                    'type': 'text',
                    'required': True
                },
                {
                    'id': 'industry',
                    'question': "您所在的具体行业是什么？",
                    'type': 'select',
                    'options': ['金融', '医疗', '教育', '制造', '科技', '其他'],
                    'required': True
                },
                {
                    'id': 'experience',
                    'question': "您在这个领域有多少年经验？",
                    'type': 'number',
                    'required': True
                }
            ],
            'training_needs': [
                {
                    'id': 'main_goals',
                    'question': "培训的主要目标是什么？（可多选）",
                    'type': 'checkbox',
                    'options': [
                        '提高工作效率',
                        '提升专业技能',
                        '加强团队合作',
                        '规范工作流程',
                        '他'
                    ],
                    'required': True
                },
                {
                    'id': 'specific_topics',
                    'question': "需要覆盖哪些具体主题或知识领域？",
                    'type': 'textarea',
                    'required': True
                }
            ],
            'document_requirements': [
                {
                    'id': 'doc_type',
                    'question': "您需要生成什么类型的文档？",
                    'type': 'select',
                    'options': [
                        '培训手册',
                        '操作指南',
                        '政策文件',
                        '课程大纲'
                    ],
                    'required': True
                },
                {
                    'id': 'format_style',
                    'question': "对文档格式和风格有什么要求？",
                    'type': 'checkbox',
                    'options': [
                        '正式商务风格',
                        '图文并茂',
                        '简洁明了',
                        '详细专业',
                        '包含案例'
                    ],
                    'required': True
                }
            ]
        }
        
        self.answer_processor = AnswerProcessor()
        self.rag_service = RAGService()
    
    def start_conversation(self, user_id: int) -> Dict:
        """
        开始新的对话会话
        """
        session = ConversationSession(user_id=user_id)
        session.current_step = self.conversation_steps[0]
        session.save()
        
        return {
            'session_id': session.id,
            'step': session.current_step,
            'questions': self.questions[session.current_step]
        }
    
    def process_answer(self, session_id: int, answers: Dict) -> Dict:
        """
        处理用户回答并返回下一步
        """
        session = ConversationSession.get(session_id)
        if not session:
            raise ValueError("Session not found")
            
        # 保存当前步骤的答案
        session.answers[session.current_step] = answers
        
        # 确定下一步
        current_index = self.conversation_steps.index(session.current_step)
        if current_index < len(self.conversation_steps) - 1:
            next_step = self.conversation_steps[current_index + 1]
            session.current_step = next_step
            session.save()
            
            return {
                'session_id': session.id,
                'step': next_step,
                'questions': self.questions[next_step]
            }
        else:
            # 对话完成
            return {
                'session_id': session.id,
                'status': 'completed',
                'answers': session.answers
            }
    
    def get_conversation_summary(self, session_id: int) -> Dict:
        """
        获取对话总结
        """
        session = ConversationSession.get(session_id)
        if not session:
            raise ValueError("Session not found")
            
        return {
            'company_info': session.answers.get('company_info', {}),
            'user_background': session.answers.get('user_background', {}),
            'training_needs': session.answers.get('training_needs', {}),
            'document_requirements': session.answers.get('document_requirements', {})
        }
    
    async def generate_document(self) -> Dict:
        """根据收集的答案生成文档"""
        try:
            # 1. 组织答案
            structured_requirements = self.answer_processor.structure_training_requirements(
                self.current_answers
            )
            
            # 2. 创建生成提示
            generation_prompt = self.answer_processor.create_generation_prompt(
                structured_requirements
            )
            
            # 3. 使用RAG生成文档
            document = await self.rag_service.generate_training_document(
                structured_requirements,
                generation_prompt
            )
            
            return document
            
        except Exception as e:
            raise Exception(f"Document generation failed: {str(e)}") 