from typing import Dict, List, Any
import json
from langchain.chat_models import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
import plotly.graph_objects as go
import plotly.express as px
import pandas as pd
import base64
from io import BytesIO

class ChartAIGenerator:
    """AI驱动的图表生成器，用于文档生成过程"""
    
    def __init__(self):
        self.llm = ChatOpenAI(
            model="deepseek-chat",
            api_key="sk-3767598f60e9415e852ff4c43ccc0852",
            base_url="https://api.deepseek.com/v1",
            temperature=0.7
        )
        
        # 图表类型映射
        self.chart_types = {
            'line': self._create_line_chart,
            'bar': self._create_bar_chart,
            'pie': self._create_pie_chart,
            'scatter': self._create_scatter_plot
        }
        
        # 麦肯锡风格配色
        self.colors = {
            'primary': ['#006BA2', '#3EBCD2', '#379A8B'],
            'secondary': ['#BFD730', '#FFB600', '#FF7900'],
            'grey': ['#4D4D4F', '#939598', '#D1D3D4']
        }

    async def analyze_and_generate_charts(self, document_content: str) -> List[Dict]:
        """分析文档内容并生成相应的图表"""
        # 1. 分析文档内容，找出需要可视化的部分
        visualization_points = await self._identify_visualization_points(document_content)
        
        # 2. 为每个可视化点生成图表
        charts = []
        for point in visualization_points:
            chart_data = await self.generate_chart_from_text(point['text'])
            chart_image = self._convert_chart_to_base64(chart_data['chart'])
            charts.append({
                'image': chart_image,
                'type': chart_data['type'],
                'context': point['context'],
                'position': point['position']
            })
        
        return charts

    async def _identify_visualization_points(self, document_content: str) -> List[Dict]:
        """识别文档中适合可视化的部分"""
        prompt = ChatPromptTemplate.from_template("""
        分析以下文档内容，找出适合用图表可视化的部分。
        对于每个部分，返回：
        1. 具体文本内容
        2. 上下文描述
        3. 在文档中的位置（段落编号）
        
        文档内容：
        {content}
        
        请以JSON格式返回结果：
        [
            {
                "text": "需要可视化的具体内容",
                "context": "上下文描述",
                "position": "段落编号"
            }
        ]
        """)
        
        messages = prompt.format_messages(content=document_content)
        response = await self.llm.agenerate([messages])
        
        try:
            return json.loads(response.generations[0][0].text)
        except json.JSONDecodeError:
            return []

    def _convert_chart_to_base64(self, fig: go.Figure) -> str:
        """将图表转换为base64编码的图片"""
        buffer = BytesIO()
        fig.write_image(buffer, format="png")
        buffer.seek(0)
        return base64.b64encode(buffer.read()).decode()

    async def generate_chart_from_text(self, text: str) -> Dict:
        """从文本生成图表"""
        # 1. 分析文本提取数据
        data = await self._extract_data_from_text(text)
        
        # 2. 推荐图表类型
        chart_type = await self._recommend_chart_type(data)
        
        # 3. 生成图表
        chart = self.chart_types[chart_type](data)
        
        return {
            'chart': chart,
            'type': chart_type,
            'data': data
        }

    async def _extract_data_from_text(self, text: str) -> Dict:
        """使用LLM从文本中提取数据"""
        prompt = ChatPromptTemplate.from_template("""
        请从以下文本中提取可视化数据。返回JSON格式，包含：
        1. 数据点
        2. 标签
        3. 类别（如果有）
        4. 时间序列（如果有）
        
        文本内容：
        {text}
        
        请以下面的JSON格式返回：
        {{
            "data_points": [...],
            "labels": [...],
            "categories": [...],
            "time_series": [...],
            "title": "图表标题",
            "x_label": "X轴标签",
            "y_label": "Y轴标签"
        }}
        """)
        
        messages = prompt.format_messages(text=text)
        response = await self.llm.agenerate([messages])
        
        try:
            return json.loads(response.generations[0][0].text)
        except json.JSONDecodeError:
            raise ValueError("无法解析LLM返回的数据")

    async def _recommend_chart_type(self, data: Dict) -> str:
        """使用LLM推荐合适的图表类型"""
        prompt = ChatPromptTemplate.from_template("""
        基于以下数据特征，推荐最合适的图表类型：
        1. 数据点数量：{num_points}
        2. 是否有时间序列：{has_time_series}
        3. 是否有类别：{has_categories}
        4. 数据维度：{dimensions}
        
        请从以下类型中选择一个：
        - line（适合时间序列数据）
        - bar（适合类别比较）
        - pie（适合占比展示）
        - scatter（适合相关性分析）
        
        只返回图表类型名称，不要其他内容。
        """)
        
        messages = prompt.format_messages(
            num_points=len(data['data_points']),
            has_time_series=bool(data.get('time_series')),
            has_categories=bool(data.get('categories')),
            dimensions=len(data['data_points'][0]) if isinstance(data['data_points'][0], list) else 1
        )
        
        response = await self.llm.agenerate([messages])
        return response.generations[0][0].text.strip().lower()

    def _create_line_chart(self, data: Dict) -> go.Figure:
        """创建折线图"""
        fig = go.Figure()
        
        # 处理多个系列
        if isinstance(data['data_points'][0], list):
            for i, series in enumerate(zip(*data['data_points'])):
                fig.add_trace(go.Scatter(
                    x=data['time_series'],
                    y=series,
                    name=data['labels'][i],
                    line=dict(width=3, color=self.colors['primary'][i % 3])
                ))
        else:
            fig.add_trace(go.Scatter(
                x=data['time_series'],
                y=data['data_points'],
                name=data['labels'][0],
                line=dict(width=3, color=self.colors['primary'][0])
            ))
        
        self._apply_layout(fig, data)
        return fig

    def _create_bar_chart(self, data: Dict) -> go.Figure:
        """创建柱状图"""
        fig = go.Figure()
        
        fig.add_trace(go.Bar(
            x=data['categories'],
            y=data['data_points'],
            marker_color=self.colors['primary'][0]
        ))
        
        self._apply_layout(fig, data)
        return fig

    def _create_pie_chart(self, data: Dict) -> go.Figure:
        """创建饼图"""
        fig = go.Figure(data=[go.Pie(
            labels=data['labels'],
            values=data['data_points'],
            hole=.3,
            marker=dict(colors=self.colors['primary'])
        )])
        
        self._apply_layout(fig, data)
        return fig

    def _create_scatter_plot(self, data: Dict) -> go.Figure:
        """创建散点图"""
        fig = go.Figure()
        
        fig.add_trace(go.Scatter(
            x=[point[0] for point in data['data_points']],
            y=[point[1] for point in data['data_points']],
            mode='markers',
            marker=dict(
                size=12,
                color=self.colors['primary'][0],
                line=dict(width=2, color='white')
            ),
            text=data['labels']
        ))
        
        self._apply_layout(fig, data)
        return fig

    def _apply_layout(self, fig: go.Figure, data: Dict):
        """应用麦肯锡风格的布局"""
        fig.update_layout(
            title=dict(
                text=data['title'],
                font=dict(size=24, color=self.colors['grey'][0])
            ),
            plot_bgcolor='white',
            showlegend=True,
            legend=dict(
                orientation="h",
                yanchor="bottom",
                y=1.02,
                xanchor="right",
                x=1
            ),
            xaxis=dict(
                title=data['x_label'],
                showgrid=True,
                gridwidth=1,
                gridcolor='#E5E5E5'
            ),
            yaxis=dict(
                title=data['y_label'],
                showgrid=True,
                gridwidth=1,
                gridcolor='#E5E5E5'
            )
        )

    def embed_charts_in_document(self, document_content: str, charts: List[Dict]) -> str:
        """将生成的图表嵌入到文档中"""
        modified_content = document_content
        
        for chart in charts:
            # 创建图表的HTML标记
            chart_html = f'''
            <div class="chart-container">
                <img src="data:image/png;base64,{chart['image']}" 
                     alt="Generated Chart" 
                     class="chart-image"/>
                <div class="chart-caption">{chart['context']}</div>
            </div>
            '''
            
            # 在指定位置插入图表
            position = int(chart['position'])
            # 这里需要实现具体的插入逻辑，根据文档格式可能需要调整
            # 示例实现：在段落后插入
            paragraphs = modified_content.split('\n\n')
            if position < len(paragraphs):
                paragraphs.insert(position + 1, chart_html)
            modified_content = '\n\n'.join(paragraphs)
        
        return modified_content