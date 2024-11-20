import asyncio
from typing import List, Dict
from langchain.chains import LLMChain
from langchain_core.prompts import PromptTemplate
from dev.Generate.TrainingDocGenerator import TrainingDocGenerator
from langchain.chains import RetrievalQA
from langchain_openai import ChatOpenAI
from sentence_transformers import SentenceTransformer
import numpy as np
from langchain_community.retrievers import WikipediaRetriever
from langchain_core.output_parsers import StrOutputParser
from langchain.schema import Document
from langchain.prompts import PromptTemplate
from langchain.vectorstores import FAISS
from langchain.embeddings import SentenceTransformerEmbeddings
from langchain.document_loaders import PyPDFLoader

import os
import json
from datetime import datetime
import backoff  # 需要安装：pip install backoff
from tenacity import retry, stop_after_attempt, wait_exponential
from dev.Generate.search import search_query_ideas
import logging
from pydantic import BaseModel, Field
from dev.prompts.searchPrompt import TRAINING_SEARCH_PROMPT, RESEARCH_REVIEW_PROMPT
from dev.prompts.outlinePrompt import OUTLINE_PROMPT, OUTLINE_REVISION_PROMPT, REFERENCES_PROMPT
from dev.prompts.reviewPrompt import CONTENT_REVIEW_PROMPT, SECTION_REVIEW_PROMPT, OUTLINE_REVIEW_PROMPT


class Citation(BaseModel):
    source_id: int = Field(..., description="The integer ID of a SPECIFIC source which justifies the answer.")
    quote: str = Field(..., description="The VERBATIM quote from the specified source that justifies the answer.")

class QuotedAnswer(BaseModel):
    answer: str = Field(..., description="The answer to the user question, which is based only on the given sources.")
    citations: List[Citation] = Field(..., description="Citations from the given sources that justify the answer.")

class AsyncTrainingDocGenerator(TrainingDocGenerator):
    """异步版本的培训文档生成器"""
    def __init__(self, file_paths, background_informations,model_name):
        # 调用父类的初始化方法
        super().__init__(file_paths,model_name, background_informations)
        if model_name=="grok-beta":
            self.llm=ChatOpenAI(
            model_name="grok-beta",              # 使用不同的模型
            base_url='https://api.x.ai/v1',
            api_key='xai-hToMyvvyeZieK687T3MFsqY2s8VibWRgvg1727PKWILihXQ4yqB3VPuJKC5klm2oMk1sjl26xCR886P2',
            temperature=0.7,                 # 不同的温度参数
            max_tokens=4000                  # 不同的最大token数
        )
        elif model_name=="gpt-4o-mini":
            self.llm=ChatOpenAI(
            model_name="gpt-4o-mini",              # 使用不同的模型
            base_url='https://gateway.agione.ai/openai/api/v2',
            api_key='as-D73mmid1JVABYjxT4_ncuw',
            temperature=0.6,                 # 不同的温度参数
            max_tokens=2000                  # 不同的最大token数
        )
        self.cache = set()  # 用于缓存搜索结果

async def generate_training_outline(self, requirements=None):
    """使用模型生成培训大纲"""
    prompt_of_informations = self.generate_prompt()
    
    # 1. 修改搜索查询生成
    search_prompt = PromptTemplate(
        template=TRAINING_SEARCH_PROMPT,
        input_variables=["topic", "requirements", "background_info", "number_of_queries"]
    )
    
    # 使用新的管道语法和结构化输出
    structured_llm = self.llm.with_structured_output(QuotedAnswer)
    search_chain = search_prompt | structured_llm
    
    search_response = await search_chain.ainvoke({
        "topic": f"{self.background_informations.get('project_title')}培训课程设计",
        "requirements": self.background_informations.get("content_needs", ""),
        "background_info": prompt_of_informations,
        "number_of_queries": 7
    })
    
    # 解析搜索响应，提取查询关键词
    queries = []
    for line in search_response.answer.split('\n'):
        if '**"' in line and '"**' in line:
            query = line.split('**"')[1].split('"**')[0].strip()
            if query:
                queries.append(query)
    print("queries",queries)
    # 2. 执行搜索
    search_results = []
    if queries:
        search_results, self.cache = await search_query_ideas(queries, self.cache, max_results=3)
    print("search_results",search_results)
    # 3. 从本地文档获取内容
  

    qa_chain = RetrievalQA.from_chain_type(
        llm=self.llm,
        chain_type="stuff",
        retriever=self.vector_store.as_retriever(),
        return_source_documents=True
    )

    response = await qa_chain.ainvoke({
        "query": f"基于{self.background_informations.get('project_title')}的培训需求，提供相关的培训内容",
    })
    print("response",response)

    # 如果需要文档内容，可以从response中获取
    docs = response.get("source_documents", [])
    content = response.get("result", "")
    
    # 4. 创建带有来源信息的文档列表
    all_docs = []
    
    # 添加搜索结果文档
    for i, result in enumerate(search_results):
        doc = Document(
            page_content=result,
            metadata={"source": f"Web Search Result #{i+1}"}
        )
        all_docs.append(doc)
    
    # 添加本地文档
    for doc in docs:
        all_docs.append(doc)
    
    # 5. 格式化所有文档
    formatted_docs = format_docs_with_id(all_docs)
    
    # 6. 生成大纲
    outline_prompt = PromptTemplate(
        template=OUTLINE_PROMPT,
        input_variables=["background_info", "context"]
    )
    
    outline_chain = outline_prompt | structured_llm
    
    outline_response = await outline_chain.ainvoke({
        "background_info": prompt_of_informations,
        "context": formatted_docs
    })
    
    # 7. 格式化输出，包含引用
    formatted_output = f"{outline_response.answer}\n\n### 参考来源\n"
    for citation in outline_response.citations:
        source_doc = all_docs[citation.source_id]
        formatted_output += f"\n[{citation.source_id}] {source_doc.metadata.get('source', 'Unknown Source')}\n引用: {citation.quote}\n"
    
    return formatted_output
          

    async def _generate_search_queries(self, section_title: str) -> dict:
        """为章节生成搜索查询"""
        search_prompt = PromptTemplate(
            template=TRAINING_SEARCH_PROMPT,
            input_variables=["topic", "requirements", "background_info", "number_of_queries"]
        )
        
        # 使用新的管道语法
        chain = search_prompt | self.llm
        
        response = await chain.ainvoke({
            "topic": section_title,
            "requirements": self.background_informations.get("content_needs", ""),
            "background_info": self.generate_prompt(),
            "number_of_queries": 3
        })
        
        return json.loads(response.content)
        
    async def generate_section_content_async(self, section_title: str, section_type: str) -> str:
        """异步生成章节内容，包含搜索和引用"""
        # 1. 生成搜索查询
        queries = await self._generate_search_queries(section_title)
        
        # 2. 执行搜索
        search_results, self.cache = search_query_ideas(
            queries, 
            self.cache,
            max_results=3
        )
        
        # 3. 从本地文档获取内容
        docs = self.vector_store.similarity_search(section_title)
        local_context = "\n\n".join([doc.page_content for doc in docs])
        
        # 4. 组合所有参考资料
        references = []
        if search_results:
            references.extend([
                f"[{i+1}] {result}" 
                for i, result in enumerate(search_results)
            ])
            
        if docs:
            references.extend([
                f"[{i+len(search_results)+1}] {doc.metadata.get('source', 'Local Document')}"
                for i, doc in enumerate(docs)
            ])
            
        # 5. 生成内容
        content = await super().generate_section_content_async(
            section_title, 
            section_type,
            context=local_context,
            references="\n".join(references)
        )
        
        # 6. 插入引用
        content = insert_references(content)
        
        return content

    async def generate_quiz_async(self, section_title: str) -> str:
        prompt_of_informations=self.generate_prompt()
        """异步生成测试题"""
        template =prompt_of_informations+ """
        特长：制定专业，针对性强，贴合度高的测试题。
        现请根据培训文档中的以下章节内容生成测试题：
        可以参考相关可靠的网上资料制定，
        章节标题: {section_title}
        
        要求：
        1. 包含多种题型（选择题、判断题、简答题）
        2. 每种题型至少2题
        3. 提供答案和解析
        4. 测试重点知识点
        
        相关档内容：
        {context}
        """
        
        docs = self.vector_store.similarity_search(section_title)
        context = "\n\n".join([doc.page_content for doc in docs])
        
        prompt = PromptTemplate(
            template=template,
            input_variables=["section_title", "context"]
        )
        print("quiz_prompt",prompt)
        chain = LLMChain(llm=self.llm, prompt=prompt)
        return await chain.arun(
            section_title=section_title,
            context=context
        )

    async def generate_summary_async(self, section_title: str) -> str:
        prompt_of_informations=self.generate_prompt()
        """异步生成章节总结"""
        template =prompt_of_informations+ """
        特长：制定条理清晰业，概括性强的总结内容。
        现请根据培训文档中的以下章节内容生成总结：
        
        章节标题: {section_title}
        
        要求：
        1. 概括主要内容和关键点
        2. 突出重要概念和原理
        3. 总结实践要点
        4. 提供进一步学习建议
        
        相关文档内容：
        {context}
        """
        
        docs = self.vector_store.similarity_search(section_title)
        context = "\n\n".join([doc.page_content for doc in docs])
        
        prompt = PromptTemplate(
            template=template,
            input_variables=["section_title", "context"]
        )
        print("summary_prompt",prompt)
        chain = LLMChain(llm=self.llm, prompt=prompt)
        return await chain.arun(
            section_title=section_title,
            context=context
        )
    def _parse_outline(self, outline):
        """解析大文本，提取章节标题"""
        sections = []
        lines = outline.split('\n')
        
        for line in lines:
            line = line.strip()
            # 匹配章节标题格式 (## 1. [章节名称] 或 ### 1.1 [子章节])
            if line.startswith('##') or line.startswith('###'):
                # 提取方括号中的章节名称
                if '[' in line and ']' in line:
                    section_title = line[line.find('[')+1:line.find(']')]
                    sections.append(section_title)
                # 提取冒号后的章节名称
                elif ':' in line:
                    section_title = line.split(':')[1].strip()
                    sections.append(section_title)
                # 直接提取标题文本
                else:
                    section_title = ' '.join(line.split()[1:]).strip()
                    print("section_title11",section_title)
                    if section_title:
                        sections.append(section_title)
        
        return sections
    
    async def generate_full_training_doc_async(self, outline: str) -> str:
        """异步生成完整的培训文档"""
        sections = self._parse_outline(outline)
        print("解析到的章节:", sections)
        full_doc = [outline]
        
        async def process_section(section: str) -> List[str]:
            """并行处理单个章节的所有内容"""
            tasks = [
                self.generate_section_content_async(section, "theory"),
                self.generate_section_content_async(section, "practice"),
                self.generate_section_content_async(section, "case_study"),
                self.generate_quiz_async(section),
                self.generate_summary_async(section)
            ]
            
            results = await asyncio.gather(*tasks)
            
            # Add review for each section's content
            review_tasks = [
                self.review_content_async(result) for result in results
            ]
            review_results = await asyncio.gather(*review_tasks)
            
            # If review indicates improvements needed, regenerate content
            for i, (content, review) in enumerate(zip(results, review_results)):
                if "需要改进" in review:
                    if i < 3:
                        section_types = ["theory", "practice", "case_study"]
                        results[i] = await self.generate_section_content_async(section, section_types[i])
                    elif i == 3:
                        results[i] = await self.generate_quiz_async(section)
                    else:
                        results[i] = await self.generate_summary_async(section)
            
            return [
                f"\n\n## {section} - 理论内容\n{results[0]}",
                f"\n\n## {section} - 实践内容\n{results[1]}",
                f"\n\n## {section} - 案例分析\n{results[2]}",
                f"\n\n## {section} - 测试题\n{results[3]}",
                f"\n\n## {section} - 总结\n{results[4]}"
            ]
        
        # 并处理所有章节
        all_section_contents = await asyncio.gather(
            *[process_section(section) for section in sections]
        )
        
        # 展平结果列表并添加到文档中
        for section_contents in all_section_contents:
            full_doc.extend(section_contents)
        
        final_doc = "\n\n".join(full_doc)
        
        # Save evaluation results
        evaluation_results = {
            "relevance": 0.9,  # Example scores - you should implement actual evaluation
            "coherence": 0.85,
            "groundedness": 0.88
        }
        
        # Save results and document
        await self.save_evaluation_results(evaluation_results, outline, final_doc)
        
        # Insert references
        final_doc = insert_references(final_doc)
        
        return final_doc

    async def review_content_async(self, content: str) -> str:
        """异步版本的内容审查"""
        review_prompt = PromptTemplate(
            template="""
            请审查以下培训内容的质量，检查：
            1. 内容的准确性和完整性
            2. 结构的合理性
            3. 表达的清晰度
            4. 示例的适当性
            5. 实践内容的可操作性
            
            内容：
            {content}
            """,
            input_variables=["content"]
        )
        
        chain = LLMChain(llm=self.llm, prompt=review_prompt)
        return await chain.arun(content=content)

    async def save_evaluation_results(self, evaluation_results: dict, outline: str, full_doc: str):
        """保存评估结果和相关信息"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # 创建评估结果目录
        eval_dir = "evaluation_results"
        if not os.path.exists(eval_dir):
            os.makedirs(eval_dir)
            
        # 准备要保存的信息
        save_data = {
            "timestamp": timestamp,
            "model_info": {
                "model_name": self.llm.model_name,
                "temperature": self.llm.temperature,
                "max_tokens": self.llm.max_tokens
            },
            "input_files": self.file_paths,
            "background_info": self.background_informations,
            "evaluation_metrics": {
                "relevance": float(evaluation_results["relevance"]),
                "coherence": float(evaluation_results["coherence"]),
                "groundedness": float(evaluation_results["groundedness"]),
                "average_score": float(sum(evaluation_results.values()) / len(evaluation_results))
            },
            "generation_info": {
                "outline_length": len(outline),
                "full_doc_length": len(full_doc)
            }
        }
        
        # 保存评估结果为JSON
        eval_file = os.path.join(eval_dir, f"evaluation_{timestamp}.json")
        with open(eval_file, 'w', encoding='utf-8') as f:
            json.dump(save_data, f, ensure_ascii=False, indent=4)
            
        # 保存生成的文档
        doc_file = os.path.join(eval_dir, f"document_{timestamp}.md")
        with open(doc_file, 'w', encoding='utf-8') as f:
            f.write("# Generated Training Document\n\n")
            f.write("## Outline\n")
            f.write(outline)
            f.write("\n\n## Full Document\n")
            f.write(full_doc)
            
        print(f"\n评估果和文档已保存到 {eval_dir} 目录")
        print(f"评估结果文件: {eval_file}")
        print(f"文档文件: {doc_file}")
        
        return eval_file, doc_file
    

# # 测试代码
# async def main():
#     background_informations = {
#         "audience_info": "主要受众:abc集团新入职员工,受众特点:年轻化，学历高，学习能力强",
#         "company_name": "123",
#         "company_culture": "客户第一，团队合作，拥抱变化，诚信，激情，敬业",
#         "company_industry": "互联网",
#         "company_competition": "行业领先",
#         "user_role": "市场营销经理",
#         "industry_info": "互联网",
#         "project_title": "市场营销经理",
#         "project_dutys": "负责公司市场营销略的制定和执行",
#         "project_goals": "了解公司市场营销策略的制定和执行",
#         "project_theme": "了解公司市场营销策略的制定和执行",
#         "project_aim": "解公司市场营销策略的制定和执行",
#         "content_needs": "市场营销策略的制定和执行",
#         "format_style": " "
#     }
    
#     file_paths = [
#         r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we approach marketing · Resend.pdf",
#         r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we evolve our knowledge base · Resend.pdf",
#         r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we help users · Resend.pdf",
#         r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we think about design · Resend.pdf",
#         r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we approach CI_CD · Resend.html",
#         r".venv/share/How we receive feedback · Resend.pdf",
#         r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we scale support · Resend.pdf",
#         r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we think about design · Resend.pdf",
#         r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we think about swag · Resend.pdf",
     
#     ]
#     import time
#     from datetime import datetime
    
#     # 记录开始时间
#     g = AsyncTrainingDocGenerator(file_paths=file_paths, model_name="gpt-4o-mini", background_informations=background_informations)
    
#     outline=g.generate_training_outline()
#     full_doc=g.generate_full_training_doc(outline)
#     print(full_doc)


#     saved_file = g.save_full_doc(full_doc)
#     evaluation_results = g.evaluate_full_doc(outline, full_doc)
#     eval_file, doc_file = g.save_evaluation_results(evaluation_results, outline, full_doc)
#     print(f"Document saved to: {saved_file}")
#     print(f"Evaluation results saved to: {eval_file}")
#     print(f"Document saved to: {doc_file}")

# if __name__ == "__main__":
#     asyncio.run(main()) 

# Define a placeholder function for insert_references
def insert_references(content: str) -> str:
    """
    Insert references into the content by replacing citation markers with proper citations.
    Example: Converts "According to [1]" into proper citation format.
    """
    if not content:
        return content
        
    # Split content into lines to process each line
    lines = content.split('\n')
    processed_lines = []
    references = []
    
    # Extract references section if it exists
    ref_start = -1
    for i, line in enumerate(lines):
        if line.strip().lower().startswith('参考文档') or line.strip().lower().startswith('references'):
            ref_start = i
            break
    
    if ref_start != -1:
        # Store references
        references = lines[ref_start+1:]
        # Remove references section from content
        lines = lines[:ref_start]
    
    # Process content
    for line in lines:
        # Look for citation patterns like [1], [2], etc.
        import re
        line = re.sub(r'\[(\d+)\]', lambda m: f'[^{m.group(1)}]', line)
        processed_lines.append(line)
    
    # Add back references as footnotes
    if references:
        processed_lines.append('\n## References')
        for i, ref in enumerate(references, 1):
            ref = ref.strip()
            if ref:
                # Remove existing reference numbers if present
                ref = re.sub(r'^\[\d+\]\s*', '', ref)
                processed_lines.append(f'[^{i}]: {ref}')
    
    return '\n'.join(processed_lines)

def format_docs_with_id(docs: List[Document]) -> str:
    """Format documents with ID numbers for reference"""
    formatted = []
    for i, doc in enumerate(docs):
        formatted.append(f"[{i}] {doc.page_content}")
    return "\n\n".join(formatted)
