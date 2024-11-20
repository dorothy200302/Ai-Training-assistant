from typing import Dict, List
from datetime import datetime

class AnswerProcessor:
    """处理和组织用户的问答内容"""
    
    def structure_training_requirements(self, answers: Dict) -> Dict:
        """将用户答案组织成结构化的培训需求"""
        return {
            "basic_info": {
                "training_purpose": answers.get('basic_info', {}).get('training_purpose'),
                "target_audience": answers.get('basic_info', {}).get('target_audience'),
                "created_at": datetime.now().isoformat()
            },
            "content_requirements": {
                "key_topics": answers.get('content_requirements', {}).get('key_topics', []),
                "difficulty_level": answers.get('content_requirements', {}).get('difficulty_level'),
                "specific_requirements": answers.get('content_requirements', {}).get('specific_requirements', [])
            },
            "format_preferences": {
                "doc_format": answers.get('format_preferences', {}).get('doc_format'),
                "style_preference": answers.get('format_preferences', {}).get('style_preference', [])
            }
        }

    def create_generation_prompt(self, structured_requirements: Dict) -> str:
        """创建文档生成提示"""
        return f"""
        请根据以下需求生成一份专业的培训文档：

        培训目的：
        {structured_requirements['basic_info']['training_purpose']}

        目标受众：
        {structured_requirements['basic_info']['target_audience']}

        关键主题：
        {structured_requirements['content_requirements']['key_topics']}

        难度级别：
        {structured_requirements['content_requirements']['difficulty_level']}

        文档格式要求：
        - 格式：{structured_requirements['format_preferences']['doc_format']}
        - 风格：{', '.join(structured_requirements['format_preferences']['style_preference'])}

        请确保文档：
        1. 结构清晰，层次分明
        2. 包含具体的示例和实践练习
        3. 符合目标受众的理解水平
        4. 提供清晰的学习目标和总结
        """ 