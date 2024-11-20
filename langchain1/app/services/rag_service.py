from typing import List, Dict
import openai
from ..config import Config
from ..utils.vector_store import VectorStore

class RAGService:
    """处理文档生成的RAG流程"""
    
    def __init__(self):
        self.vector_store = VectorStore()
        self.openai_client = openai.Client(api_key=Config.OPENAI_API_KEY)
        
    async def generate_training_document(self, 
                                      requirements: Dict,
                                      prompt: str) -> Dict:
        """使用RAG生成培训文档"""
        try:
            # 1. 从要求中提取关键词
            keywords = self._extract_keywords(requirements)
            
            # 2. 检索相关内容
            relevant_content = await self.vector_store.search(keywords)
            
            # 3. 增强生成提示
            enhanced_prompt = self._enhance_prompt(prompt, relevant_content)
            
            # 4. 生成文档内容
            document_content = await self._generate_content(enhanced_prompt)
            
            # 5. 组织文档结构
            return self._structure_document(document_content, requirements)
            
        except Exception as e:
            raise Exception(f"RAG document generation failed: {str(e)}")
    
    def _extract_keywords(self, requirements: Dict) -> List[str]:
        """从需求中提取关键词"""
        keywords = []
        
        # 添加关键主题
        if 'key_topics' in requirements['content_requirements']:
            keywords.extend(requirements['content_requirements']['key_topics'])
        
        # 添加培训目的关键词
        if 'training_purpose' in requirements['basic_info']:
            purpose = requirements['basic_info']['training_purpose']
            # 简单的关键词提取，实际项目中可以使用更复杂的NLP方法
            keywords.extend([word for word in purpose.split() if len(word) > 3])
        
        return list(set(keywords))  # 去重
    
    def _enhance_prompt(self, base_prompt: str, relevant_content: List[Dict]) -> str:
        """增强生成提示"""
        enhanced_prompt = base_prompt + "\n\n参考资料：\n"
        
        for content in relevant_content:
            enhanced_prompt += f"\n- {content['title']}:\n{content['excerpt']}\n"
        
        enhanced_prompt += "\n请基于以上参考资料和要求生成培训文档。"
        return enhanced_prompt
    
    async def _generate_content(self, prompt: str) -> str:
        """使用OpenAI生成内容"""
        try:
            response = await self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "你是一个专业的培训文档编写专家。"},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=4000
            )
            return response.choices[0].message.content
            
        except Exception as e:
            raise Exception(f"OpenAI API error: {str(e)}")
    
    def _structure_document(self, content: str, requirements: Dict) -> Dict:
        """组织文档结构"""
        return {
            "metadata": {
                "title": f"培训文档：{requirements['basic_info']['training_purpose']}",
                "target_audience": requirements['basic_info']['target_audience'],
                "difficulty_level": requirements['content_requirements']['difficulty_level'],
                "format": requirements['format_preferences']['doc_format'],
                "created_at": datetime.now().isoformat()
            },
            "content": content,
            "requirements": requirements
        } 