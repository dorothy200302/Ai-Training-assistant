from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import asyncio
from uuid import uuid4

class OutlineRequest(BaseModel):
    doc_path: str
    requirements: Optional[str] = None

class OutlineResponse(BaseModel):
    task_id: str
    outline: str
    sections: List[Dict[str, str]]

class OutlineApproval(BaseModel):
    task_id: str
    approved: bool
    modifications: Optional[Dict[str, str]] = None

class ContentGenerationStatus(BaseModel):
    task_id: str
    status: str
    progress: int
    current_section: Optional[str] = None
    completed_sections: List[str] = []

class TrainingDocAPI:
    def __init__(self):
        self.tasks = {}  # 存储任务状态
        self.generators = {}  # 存储生成器实例
        
    async def generate_outline(self, doc_path: str, requirements: Optional[str] = None) -> OutlineResponse:
        """生成大纲并等待用户确认"""
        task_id = str(uuid4())
        
        try:
            # 初始化生成器
            generator = TrainingDocGenerator(api_key="your-openai-api-key")
            self.generators[task_id] = generator
            
            # 加载文档
            await generator.load_documents(doc_path)
            
            # 生成大纲
            outline_prompt = f"""
            请基于提供的文档内容生成培训大纲。
            
            额外要求：
            {requirements if requirements else '无'}
            
            格式要求：
            # 培训大纲
            
            ## 1. [章节名称]
            学习目标：[具体目标]
            主要内容：
            - [要点1]
            - [要点2]
            
            ### 1.1 [子章节]
            - [内容描述]
            """
            
            outline = await generator.generate_training_outline(outline_prompt)
            sections = generator._parse_outline(outline)
            
            # 存储任务信息
            self.tasks[task_id] = {
                'status': 'outline_generated',
                'outline': outline,
                'sections': sections,
                'progress': 0,
                'completed_sections': []
            }
            
            return OutlineResponse(
                task_id=task_id,
                outline=outline,
                sections=sections
            )
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    async def generate_content(self, task_id: str, outline_approval: OutlineApproval) -> str:
        """根据确认的大纲生成内容"""
        if task_id not in self.tasks:
            raise HTTPException(status_code=404, detail="Task not found")
        
        if not outline_approval.approved:
            # 处理大纲修改请求
            if outline_approval.modifications:
                # 更新大纲
                generator = self.generators[task_id]
                await generator.update_outline(outline_approval.modifications)
        
        # 开始生成内容
        self.tasks[task_id]['status'] = 'generating_content'
        
        try:
            generator = self.generators[task_id]
            sections = self.tasks[task_id]['sections']
            total_sections = len(sections)
            
            full_doc = []
            for i, section in enumerate(sections):
                # 更新进度
                self.tasks[task_id].update({
                    'progress': int((i / total_sections) * 100),
                    'current_section': section['title']
                })
                
                # 生成各部分内容
                section_content = await generator.generate_section_content(
                    section['title'],
                    section['type']
                )
                full_doc.append(section_content)
                
                # 更新完成的章节
                self.tasks[task_id]['completed_sections'].append(section['title'])
            
            # 完成生成
            self.tasks[task_id].update({
                'status': 'completed',
                'progress': 100,
                'current_section': None
            })
            
            return "\n\n".join(full_doc)
            
        except Exception as e:
            self.tasks[task_id]['status'] = 'failed'
            raise HTTPException(status_code=500, detail=str(e))

    async def get_generation_status(self, task_id: str) -> ContentGenerationStatus:
        """获取内容生成进度"""
        if task_id not in self.tasks:
            raise HTTPException(status_code=404, detail="Task not found")
        
        task = self.tasks[task_id]
        return ContentGenerationStatus(
            task_id=task_id,
            status=task['status'],
            progress=task['progress'],
            current_section=task.get('current_section'),
            completed_sections=task.get('completed_sections', [])
        )

# FastAPI 应用
app = FastAPI()
doc_api = TrainingDocAPI()

@app.post("/api/outline", response_model=OutlineResponse)
async def create_outline(request: OutlineRequest):
    return await doc_api.generate_outline(request.doc_path, request.requirements)

@app.post("/api/content/{task_id}")
async def create_content(task_id: str, approval: OutlineApproval):
    return await doc_api.generate_content(task_id, approval)

@app.get("/api/status/{task_id}", response_model=ContentGenerationStatus)
async def get_status(task_id: str):
    return await doc_api.get_generation_status(task_id)
