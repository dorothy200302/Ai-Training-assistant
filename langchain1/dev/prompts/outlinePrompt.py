OUTLINE_PROMPT = """你是一个专业的培训课程设计专家。请基于提供的背景信息和参考文档，
生成一个专业、系统、结构清晰的培训大纲。

背景信息:
{background_info}

参考文档内容:
{context}

输出要求:
1. 大纲结构:
   - 培训概述(包含培训目标、受众分析、预期收益)
   - 6-9个主要章节
   - 每个主章节下设5-6个子章节
   - 实践环节和案例分析
   - 考核评估方式

2. 每个章节需包含:
   - 章节标题
   - 学习目标
   - 核心内容要点(3-5点)
   - 预计时长
   - 教学方式

3. 内容要求:
   - 符合教学规律，由浅入深
   - 理论与实践相结合
   - 确保内容的专业性和实用性
   - 与岗位需求高度相关
   - 适合目标受众的认知水平

4. 格式要求:
# 培训大纲

## 培训概述
- 培训目标：
- 目标受众：
- 预期收益：
- 总课时：

## 1. [章节名称] (XX分钟)
### 学习目标
- [具体目标1]
- [具体目标2]

### 核心内容
1.1 [子章节名称]
- [要点1]
- [要点2]

### 教学方式
- [具体方式]

## 实践环节
- [具体实践任务]

## 考核评估
- [评估方式]

请基于以上要求，生成一个专业、完整的培训大纲。确保内容与提供的背景信息和参考文档高度相关。
"""

OUTLINE_REVISION_PROMPT = """你是一个专业的培训课程设计专家。请根据以下反馈意见，对培训大纲进行优化和调整。

原大纲:
{original_outline}

修改要求:
{revision_requirements}

请保持原有的格式结构，对内容进行优化调整。确保修改后的大纲更加符合需求，同时保持专业性和实用性。
"""

REFERENCES_PROMPT = """你是一个负责编写技术文档参考文献的AI助手。
请基于以下规则生成规范的参考文献：

1. 格式要求：
   - 必须基于所有提供的内容生成参考条目
   - 避免重复条目
   - 使用编号列表
   - 每个条目占一行

2. 条目格式：
   作者列表(如有), 标题, 发表位置, 发表日期, 链接
   - 作者格式: 姓,名首字母. (例如: Hubert, K.F.)
   - 除标题外其他信息可选
   
3. 示例参考条目：
   1. Hubert, K.F., Awa, K.N., Zabelina, D.L. The current state of artificial intelligence generative language models is more creative than humans on divergent thinking tasks. Sci Rep 14, 3440 (2024). https://doi.org/10.1038/s41598-024-53303-w

   2. The Need For AI-Powered Cybersecurity to Tackle AI-Driven Cyberattacks, https://www.isaca.org/resources/news-and-trends/isaca-now-blog/2024/the-need-for-ai-powered-cybersecurity-to-tackle-ai-driven-cyberattacks

请使用markdown格式输出参考文献列表。
"""
