# Copyright (c) 2024 Claudionor Coelho Jr, Fabrício José Vieira Ceolin, Luiza Nacif Coelho

import logging
from typing import List, Tuple

from .tools import tools, tavily

def get_additional_info(link):
    arxiv = tools["arxiv"]
    pubmed = tools["pub_med"]
    doc = ""
    if "https://arxiv.org/" in link:
        arxiv_entry = link.split("/")[-1].strip()
        doc = arxiv.run(arxiv_entry)
    elif "pubmed" in link:
        doc = pubmed.run(link)[0]
    if doc:
        doc = ", " + doc
    return doc

def search_query_ideas(queries: List[str], cache: set, max_results: int = 3) -> Tuple[List[str], set]:
    """执行搜索查询并返回结果"""
    if isinstance(queries, str):
        queries = [queries]
    
    results = []
    for query in queries:
        # 提取实际的查询文本
        if isinstance(query, dict):
            query = query.get('query', '')
        elif '**"' in query:
            query = query.split('**"')[1].split('"**')[0]
            
        query = query.strip()
        if not query:
            continue
            
        # 执行搜索...
        
    return results, cache
