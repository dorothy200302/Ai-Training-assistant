TRAINING_SEARCH_PROMPT = """你是一位专业的培训研究专家。请基于以下培训主题和要求，生成相关的搜索查询列表。

培训主题：
{topic}

培训要求：
{requirements}

背景信息：
{background_info}

请生成不超过{number_of_queries}个搜索查询，确保查询：
1. 覆盖主要知识点
2. 包含行业最新动态
3. 关注实践案例
4. 考虑受众特点
5. 符合培训目标

输出格式：
1. [查询关键词1]
2. [查询关键词2]
...

每个查询需要说明搜索目的和预期获取的信息类型。
"""

RESEARCH_REVIEW_PROMPT = """你是一位专业的培训研究专家。请基于以下审查意见，生成补充研究的查询列表。

原始内容：
{content}

审查意见：
{review_comments}

研究重点：
1. 需要补充的知识点
2. 需要更新的内容
3. 需要深化的案例
4. 需要验证的观点

请生成不超过3个搜索查询，确保查询：
1. 针对性强
2. 范围明确
3. 重点突出
4. 便于检索

输出格式：
1. [查询关键词1] - [预期获取的信息]
2. [查询关键词2] - [预期获取的信息]
3. [查询关键词3] - [预期获取的信息]
""" 