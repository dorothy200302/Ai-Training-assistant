import os
import sys

# Add the project root directory to Python path
project_root = os.path.dirname(os.path.abspath(__file__))
print(f"Adding {project_root} to Python path")
sys.path.insert(0, project_root)

# Import the FastAPI app
from main import app
import uvicorn
from Chatbot.test_embeddings import SiliconFlowEmbeddings

# 初始化嵌入模型
embeddings = SiliconFlowEmbeddings(
    api_key="sk-jfiddowyvulysbcxctumczcxqwiwtrfuldjgfvpwujtvncbg"
)

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        reload_dirs=[project_root]
    )