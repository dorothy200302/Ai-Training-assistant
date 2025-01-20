from ..Chatbot.test_embeddings import SiliconFlowEmbeddings

def get_embeddings():
    """获取嵌入模型实例"""
    return SiliconFlowEmbeddings(
        api_key="sk-jfiddowyvulysbcxctumczcxqwiwtrfuldjgfvpwujtvncbg"
    ) 