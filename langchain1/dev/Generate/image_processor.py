from typing import Dict, List, Optional, Union
import base64
from PIL import Image
import io
import requests
from langchain.chat_models import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
import pytesseract
import cv2
import numpy as np

class ImageProcessor:
    """图像处理器，用于分析和提取图像中的内容"""
    
    def __init__(self):
        self.llm = ChatOpenAI(
            model_name="deepseek-chat",
            temperature=0.7
        )
        # 设置Tesseract路径
        pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
    
    async def analyze_image(self, image_data: bytes) -> Dict:
        """分析图像内容"""
        try:
            # 转换图像数据为PIL Image
            image = Image.open(io.BytesIO(image_data))
            
            # 预处理图像
            processed_image = self.preprocess_image(image)
            
            # 提取文本
            text = await self._extract_text(processed_image)
            
            # 识别图像类型
            image_type = await self._identify_image_type(processed_image)
            
            # 分析内容
            content_analysis = await self._analyze_content(processed_image)
            
            # 如果是图表，进行图表分析
            chart_analysis = None
            if image_type == "chart":
                chart_analysis = await self._analyze_chart(processed_image)
            
            return {
                "type": image_type,
                "text": text,
                "content": content_analysis,
                "chart_analysis": chart_analysis
            }
            
        except Exception as e:
            raise Exception(f"Image analysis error: {str(e)}")
    
    async def _extract_text(self, image: Image.Image) -> str:
        """提取图像中的文本"""
        try:
            # 转换为OpenCV格式
            img_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            # 图像预处理
            gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
            thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
            
            # 使用Tesseract进行OCR
            text = pytesseract.image_to_string(thresh, lang='chi_sim+eng')
            return text.strip()
            
        except Exception as e:
            raise Exception(f"Text extraction error: {str(e)}")
    
    async def _identify_image_type(self, image: Image.Image) -> str:
        """识别图像类型（普通图片、图表、表格等）"""
        try:
            # 转换图像为base64
            buffered = io.BytesIO()
            image.save(buffered, format="PNG")
            img_str = base64.b64encode(buffered.getvalue()).decode()
            
            # 使用LLM识别图像类型
            prompt = ChatPromptTemplate.from_template("""
            分析以下base64编码的图像，判断其类型。可能的类型包括：
            1. chart (图表，如柱状图、折线图、饼图等)
            2. table (表格)
            3. image (普通图片)
            
            图像数据：{image}
            
            请仅返回类型名称（chart/table/image）。
            """)
            
            response = await self.llm.agenerate([prompt.format_messages(image=img_str)])
            return response.generations[0][0].text.strip().lower()
            
        except Exception as e:
            raise Exception(f"Image type identification error: {str(e)}")
    
    async def _analyze_content(self, image: Image.Image) -> Dict:
        """分析图像内容"""
        try:
            # 转换图像为base64
            buffered = io.BytesIO()
            image.save(buffered, format="PNG")
            img_str = base64.b64encode(buffered.getvalue()).decode()
            
            # 使用LLM分析图像内容
            prompt = ChatPromptTemplate.from_template("""
            分析以下base64编码的图像内容，提供以下信息：
            1. 主题/标题
            2. 关键元素
            3. 颜色方案
            4. 布局特征
            
            图像数据：{image}
            
            请以JSON格式返回结果。
            """)
            
            response = await self.llm.agenerate([prompt.format_messages(image=img_str)])
            return eval(response.generations[0][0].text.strip())
            
        except Exception as e:
            raise Exception(f"Content analysis error: {str(e)}")
    
    async def _analyze_chart(self, image: Image.Image) -> Dict:
        """分析图表内容"""
        try:
            # 转换为OpenCV格式
            img_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            # 图像预处理
            gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
            edges = cv2.Canny(gray, 50, 150, apertureSize=3)
            
            # 检测直线（用于识别坐标轴）
            lines = cv2.HoughLinesP(edges, 1, np.pi/180, 100, minLineLength=100, maxLineGap=10)
            
            # 检测轮廓（用于识别数据点）
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            # 分析结果
            analysis = {
                "axes": len(lines) if lines is not None else 0,
                "data_points": len(contours),
                "chart_area": image.size
            }
            
            return analysis
            
        except Exception as e:
            raise Exception(f"Chart analysis error: {str(e)}")
    
    def preprocess_image(self, image: Image.Image) -> Image.Image:
        """图像预处理"""
        try:
            # 转换为OpenCV格式
            img_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            # 去噪
            denoised = cv2.fastNlMeansDenoisingColored(img_cv)
            
            # 增强对比度
            lab = cv2.cvtColor(denoised, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
            cl = clahe.apply(l)
            enhanced = cv2.merge((cl,a,b))
            enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)
            
            # 转回PIL格式
            return Image.fromarray(cv2.cvtColor(enhanced, cv2.COLOR_BGR2RGB))
            
        except Exception as e:
            raise Exception(f"Image preprocessing error: {str(e)}")
    
    async def extract_chart_data(self, image: Image.Image) -> Dict:
        """从图表中提取数据"""
        try:
            # 提取文本（包括标题、标签等）
            text = await self._extract_text(image)
            
            # 分析图表类型和内容
            content_analysis = await self._analyze_content(image)
            
            # 提取数据点
            img_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
            edges = cv2.Canny(gray, 50, 150, apertureSize=3)
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            # 获取数据点坐标
            data_points = []
            for contour in contours:
                M = cv2.moments(contour)
                if M["m00"] != 0:
                    cx = int(M["m10"] / M["m00"])
                    cy = int(M["m01"] / M["m00"])
                    data_points.append((cx, cy))
            
            return {
                "title": content_analysis.get("title"),
                "type": content_analysis.get("chart_type"),
                "text_content": text,
                "data_points": data_points,
                "analysis": content_analysis
            }
            
        except Exception as e:
            raise Exception(f"Chart data extraction error: {str(e)}") 