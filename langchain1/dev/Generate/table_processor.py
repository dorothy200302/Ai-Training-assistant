import re
from typing import List, Dict, Optional, Union
from dataclasses import dataclass
import pandas as pd
import io
import numpy as np
from langchain.chat_models import ChatOpenAI
from langchain.prompts import ChatPromptTemplate

@dataclass
class TableStyle:
    border_style: str = 'solid'
    header_style: str = 'bold'
    alignment: str = 'left'
    cell_padding: int = 5
    border_color: str = '#000000'
    header_background: str = '#f0f0f0'

class TableProcessor:
    """表格处理器，用于解析和分析表格数据"""
    
    def __init__(self):
        self.llm = ChatOpenAI(
            model_name="deepseek-chat",
            temperature=0.7
        )
        self.supported_styles = {
            'simple': TableStyle(),
            'grid': TableStyle(border_style='double'),
            'pipe': TableStyle(border_style='none'),
            'html': TableStyle(
                border_style='solid',
                header_background='#e6e6e6',
                cell_padding=8
            )
        }
    
    def parse_table(self, table_content: str) -> Dict:
        """解析表格内容"""
        try:
            # 尝试使用pandas解析表格内容
            if isinstance(table_content, str):
                # 如果是字符串，尝试解析为DataFrame
                df = pd.read_csv(io.StringIO(table_content))
            else:
                # 如果已经是DataFrame或类似格式，直接使用
                df = pd.DataFrame(table_content)
            
            # 提取表格基本信息
            table_info = {
                "columns": df.columns.tolist(),
                "row_count": len(df),
                "column_count": len(df.columns),
                "data_types": {col: str(df[col].dtype) for col in df.columns},
                "data": df.to_dict(orient="records")
            }
            
            return table_info
            
        except Exception as e:
            raise Exception(f"Table parsing error: {str(e)}")
    
    async def analyze_table_structure(self, table_info: Dict) -> Dict:
        """分析表格结构"""
        try:
            # 分析列类型和数据特征
            column_analysis = {}
            for col in table_info["columns"]:
                col_data = [row[col] for row in table_info["data"]]
                
                analysis = {
                    "data_type": table_info["data_types"][col],
                    "unique_values": len(set(col_data)),
                    "null_count": sum(1 for x in col_data if pd.isna(x)),
                    "sample_values": list(set(col_data))[:5]
                }
                
                if table_info["data_types"][col] in ["int64", "float64"]:
                    analysis.update({
                        "min": min(col_data),
                        "max": max(col_data),
                        "mean": sum(col_data) / len(col_data),
                        "median": sorted(col_data)[len(col_data)//2]
                    })
                
                column_analysis[col] = analysis
            
            return {
                "column_analysis": column_analysis,
                "relationships": await self._analyze_column_relationships(table_info)
            }
            
        except Exception as e:
            raise Exception(f"Table structure analysis error: {str(e)}")
    
    async def suggest_visualizations(self, table_info: Dict) -> List[Dict]:
        """建议适合的可视化方式"""
        try:
            # 分析数据特征
            structure_analysis = await self.analyze_table_structure(table_info)
            
            # 使用LLM生成可视化建议
            prompt = ChatPromptTemplate.from_template("""
            基于以下表格数据特征，推荐合适的可视化方式：
            
            表格信息：
            {table_info}
            
            结构分析：
            {structure_analysis}
            
            请推荐3-5种最适合的可视化方式，并说明原因。
            返回JSON格式，包含：
            1. 图表类型
            2. 建议使用的列
            3. 推荐原因
            4. 可能的见解
            """)
            
            messages = prompt.format_messages(
                table_info=table_info,
                structure_analysis=structure_analysis
            )
            
            response = await self.llm.agenerate([messages])
            suggestions = response.generations[0][0].text
            
            return suggestions
            
        except Exception as e:
            raise Exception(f"Visualization suggestion error: {str(e)}")
    
    async def _analyze_column_relationships(self, table_info: Dict) -> Dict:
        """分析列之间的关系"""
        try:
            df = pd.DataFrame(table_info["data"])
            
            # 分析数值列之间的相关性
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            correlations = {}
            
            if len(numeric_cols) > 1:
                corr_matrix = df[numeric_cols].corr()
                for col1 in numeric_cols:
                    for col2 in numeric_cols:
                        if col1 != col2:
                            correlations[f"{col1}-{col2}"] = corr_matrix.loc[col1, col2]
            
            # 分析分类列之间的关联
            categorical_cols = df.select_dtypes(include=['object']).columns
            category_relations = {}
            
            if len(categorical_cols) > 1:
                for col1 in categorical_cols:
                    for col2 in categorical_cols:
                        if col1 != col2:
                            contingency = pd.crosstab(df[col1], df[col2])
                            category_relations[f"{col1}-{col2}"] = {
                                "unique_combinations": len(contingency),
                                "most_common": contingency.values.max()
                            }
            
            return {
                "numeric_correlations": correlations,
                "categorical_relations": category_relations
            }
            
        except Exception as e:
            raise Exception(f"Column relationship analysis error: {str(e)}")
    
    def format_table(self, table_data: Dict, style: str = 'grid') -> str:
        """将表格数据格式化为指定样式"""
        if style not in self.supported_styles:
            raise ValueError(f"Unsupported style: {style}")
            
        table_style = self.supported_styles[style]
        
        # 创建HTML表格
        html = ['<table style="border-collapse: collapse; width: 100%;">']
        
        # 添加表头
        html.append('<thead>')
        html.append('<tr>')
        for header in table_data['header']:
            html.append(
                f'<th style="'
                f'padding: {table_style.cell_padding}px; '
                f'background-color: {table_style.header_background}; '
                f'border: 1px {table_style.border_style} {table_style.border_color}; '
                f'text-align: {table_style.alignment}; '
                f'font-weight: {table_style.header_style};">'
                f'{header}</th>'
            )
        html.append('</tr>')
        html.append('</thead>')
        
        # 添加数据行
        html.append('<tbody>')
        for row in table_data['data']:
            html.append('<tr>')
            for cell in row:
                html.append(
                    f'<td style="'
                    f'padding: {table_style.cell_padding}px; '
                    f'border: 1px {table_style.border_style} {table_style.border_color}; '
                    f'text-align: {table_style.alignment};">'
                    f'{cell}</td>'
                )
            html.append('</tr>')
        html.append('</tbody>')
        
        html.append('</table>')
        return '\n'.join(html)
    
    def _parse_row(self, row: str) -> List[str]:
        """解析表格行"""
        # 移除首尾的管道符号
        row = row.strip().strip('|')
        # 分割单元格并清理空白
        return [cell.strip() for cell in row.split('|')]
    
    def _is_valid_separator(self, separator: str) -> bool:
        """验证分隔行是否有效"""
        separator = separator.strip().strip('|')
        cells = separator.split('|')
        
        for cell in cells:
            cell = cell.strip()
            if not cell.replace('-', '').replace(':', ''):
                continue
            return False
        return True
    
    def convert_to_markdown(self, table_data: Dict) -> str:
        """将表格数据转换为Markdown格式"""
        lines = []
        
        # 添加表头
        header = ' | '.join(table_data['header'])
        lines.append(f'| {header} |')
        
        # 添加分隔行
        separator = ' | '.join(['-' * len(col) for col in table_data['header']])
        lines.append(f'| {separator} |')
        
        # 添加数据行
        for row in table_data['data']:
            row_str = ' | '.join(str(cell) for cell in row)
            lines.append(f'| {row_str} |')
        
        return '\n'.join(lines)
    
    def convert_to_latex(self, table_data: Dict) -> str:
        """将表格数据转换为LaTeX格式"""
        lines = []
        
        # 表格环境开始
        column_format = 'l' * len(table_data['header'])
        lines.append(r'\begin{tabular}{' + column_format + '}')
        lines.append(r'\hline')
        
        # 添加表头
        header = ' & '.join(table_data['header'])
        lines.append(header + r' \\')
        lines.append(r'\hline')
        
        # 添加数据行
        for row in table_data['data']:
            row_str = ' & '.join(str(cell) for cell in row)
            lines.append(row_str + r' \\')
        
        # 表格环境结束
        lines.append(r'\hline')
        lines.append(r'\end{tabular}')
        
        return '\n'.join(lines)
    
    def export_to_excel(self, table_data: Dict, filename: str) -> None:
        """将表格数据导出为Excel文件"""
        df = pd.DataFrame(table_data['data'], columns=table_data['header'])
        df.to_excel(filename, index=False) 