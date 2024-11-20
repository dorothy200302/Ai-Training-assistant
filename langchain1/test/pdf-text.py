# import fitz  # PyMuPDF库
from PIL import Image
import paddleocr
# 初始化PaddleOCR模型
ocr = paddleocr.PaddleOCR(use_gpu=False)

# 打开PDF文件
pdf_path = r'C:\Users\dorot\PycharmProjects\langchain1\.venv\share\测试文件.pdf'
pdf_doc = fitz.open(pdf_path)

# 遍历PDF中的每一页
for page_index in range(len(pdf_doc)):
    page = pdf_doc[page_index]
    # 将PDF页面转换为图像
    img = page.get_image(zoom=0.2, scale=1.5)  # 根据需要调整zoom和scale参数
    img_path = f'{pdf_path}_{page_index}.jpg'  # 保存图像的路径和文件名
    img.save(img_path)

import cv2  # OpenCV库用于读取图像文件
from PIL import Image  # PIL库用于对图像进行处理和转换格式
import paddleocr  # PaddleOCR库用于文本识别

for img_path in img:

    # 读取图像文件
    img = cv2.imread(img_path)  # 使用OpenCV读取图像文件
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)  # 将图像从BGR格式转换为RGB格式，因为PaddleOCR需要RGB格式的输入
    img = Image.fromarray(img)  # 将OpenCV读取的图像转换为PIL库支持的格式

# 使用PaddleOCR进行文本识别
    result = ocr.ocr(img, use_gpu=False)
# 打印识别结果
    print(result)
