from langchain.document_loaders import PyPDFLoader, TextLoader
from langchain.text_splitter import CharacterTextSplitter
from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import FAISS
from langchain.chat_models import ChatOpenAI
from langchain.memory import ConversationBufferMemory
from langchain.chains import ConversationalRetrievalChain
import os

class DocumentChat:
    def __init__(self, model_name):
        self.embeddings = OpenAIEmbeddings(
            model="text-embedding-3-small",
            api_key="as-D73mmid1JVABYjxT4_ncuw",
            base_url="https://gateway.agione.ai/openai/api/v2"
        )
        if model_name == "grok":
            self.llm = ChatOpenAI(
                model_name="grok-beta",
                base_url='https://api.x.ai/v1',
                api_key='xai-hToMyvvyeZieK687T3MFsqY2s8VibWRgvg1727PKWILihXQ4yqB3VPuJKC5klm2oMk1sjl26xCR886P2',
                temperature=0.7
            )
        elif model_name == "gpt-4o-mini":
            self.llm = ChatOpenAI(
                model_name="gpt-4o-mini",
                api_key="as-D73mmid1JVABYjxT4_ncuw",
                base_url="https://gateway.agione.ai/openai/api/v2",
                temperature=0.7
            )
        elif model_name=="gpt-4":
            self.llm = ChatOpenAI(
                model_name="gpt-4",
                api_key="as-D73mmid1JVABYjxT4_ncuw",
                base_url="https://gateway.agione.ai/openai/api/v2",
                temperature=0.7
            )
        elif model_name=="Qwen 7B chat":
            self.llm = ChatOpenAI(  # 使用 ChatOpenAI 替代 ChatQwen
                model_name="Qwen/Qwen2-7B-Instruct",
                api_key="as-D73mmid1JVABYjxT4_ncuw",
                base_url="https://gateway.agione.ai/siliconflow/api/v2",
                temperature=0.7
            )
        else:
            # 默认使用 GPT-4
            self.llm = ChatOpenAI(
                model_name="gpt-4",
                api_key="as-D73mmid1JVABYjxT4_ncuw",
                base_url="https://gateway.agione.ai/openai/api/v2",
                temperature=0.7
            )
        self.memory = ConversationBufferMemory(
            memory_key="chat_history",
            output_key="answer",
            return_messages=True
        )
        self.vector_store = None

    def load_document(self, file_paths):
        """加载并处理多篇文档，支持PDF、TXT格式"""
        all_documents = []
        print(f"Processing {len(file_paths)} files: {file_paths}")
        
        # 处理每个文件路径
        for file_path in file_paths:
            try:
                print(f"Loading file: {file_path}")
                # 检查文件是否存在且有内容
                if not os.path.exists(file_path):
                    print(f"File does not exist: {file_path}")
                    continue
                    
                if os.path.getsize(file_path) == 0:
                    print(f"File is empty: {file_path}")
                    continue

                # 获取真实的文件扩展名（小写）
                file_ext = os.path.splitext(file_path)[1].lower()
                print(f"File extension: {file_ext}")

                # 根据文件类型选择加载器
                if file_ext == '.pdf':
                    try:
                        print("Initializing PyPDFLoader")
                        loader = PyPDFLoader(file_path)
                        print("Successfully initialized PyPDFLoader")
                    except Exception as e:
                        print(f"PyPDFLoader initialization failed: {str(e)}")
                        if hasattr(e, '__traceback__'):
                            import traceback
                            traceback.print_exc()
                        continue
                else:
                    # 对于其他文件类型，使用TextLoader
                    encodings = ['utf-8', 'gbk', 'latin1']
                    loader = None
                    for encoding in encodings:
                        try:
                            print(f"Attempting to load with {encoding} encoding")
                            loader = TextLoader(file_path, encoding=encoding)
                            # 尝试读取一小部分内容来验证编码
                            with open(file_path, 'r', encoding=encoding) as f:
                                f.read(1024)
                            print(f"Successfully loaded with {encoding} encoding")
                            break
                        except UnicodeDecodeError:
                            print(f"Failed to decode with {encoding} encoding")
                            continue
                        except Exception as e:
                            print(f"TextLoader failed with {encoding}: {str(e)}")
                            if hasattr(e, '__traceback__'):
                                import traceback
                                traceback.print_exc()
                            continue
                    
                    if loader is None:
                        print(f"Failed to load file with any encoding: {file_path}")
                        continue

                # 加载文档
                print(f"Loading document content with {loader.__class__.__name__}")
                try:
                    documents = loader.load()
                    if not documents:
                        print(f"No content loaded from file: {file_path}")
                        continue
                    print(f"Successfully loaded {len(documents)} documents from {file_path}")
                    all_documents.extend(documents)
                except Exception as e:
                    print(f"Error loading content from {file_path}: {str(e)}")
                    if hasattr(e, '__traceback__'):
                        import traceback
                        traceback.print_exc()
                    continue
                
            except Exception as e:
                print(f"Error processing file {file_path}: {str(e)}")
                if hasattr(e, '__traceback__'):
                    import traceback
                    traceback.print_exc()
                continue

        if not all_documents:
            error_msg = "无法加载任何文档。请确保文件为PDF或文本格式（如.txt）且未损坏。"
            print(error_msg)
            raise Exception(error_msg)

        try:
            print("Starting document splitting process")
            # 分割所有文档
            text_splitter = CharacterTextSplitter(
                chunk_size=1000,
                chunk_overlap=200
            )
            texts = text_splitter.split_documents(all_documents)
            print(f"Successfully split documents into {len(texts)} chunks")

            print("Creating vector store")
            # 创建向量存储
            self.vector_store = FAISS.from_documents(texts, self.embeddings)
            print("Successfully created vector store")

            return f"成功加载 {len(file_paths)} 篇文档"
        except Exception as e:
            error_msg = f"Error processing documents: {str(e)}"
            print(error_msg)
            if hasattr(e, '__traceback__'):
                import traceback
                traceback.print_exc()
            raise Exception(error_msg)

    def chat(self, query):
        """与文档进行对话"""
        if not self.vector_store:
            return "请先加载文档！"
        
        # 创建对话链
        qa_chain = ConversationalRetrievalChain.from_llm(
            llm=self.llm,
            retriever=self.vector_store.as_retriever(
                search_kwargs={"k": 3}  # 检索最相关的3个文档片段
            ),
            memory=self.memory,
            return_source_documents=True,
            verbose=True  # 添加详细输出以便调试
        )
        
        # 使用 invoke 替代直接调用
        result = qa_chain.invoke({"question": query})
        
        # 打印源文档以便调试
        print("\n相关文档片段:")
        for doc in result['source_documents']:
            print(f"- {doc.page_content[:200]}...")
        
        return result['answer']

# # 使用示例
# def main():
#     # 初始化聊天系统
#     chat_system = DocumentChat(api_key="as-D73mmid1JVABYjxT4_ncuw")
    
#     # 修复文件路径 - 使用原始字符串和正确的完整路径
#     file_paths = [r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\阿里新人入职培训内容和流程-三茅人力资源网.pdf",
# r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\阿里巴巴集团介绍-阿里巴巴集团.html",

#                   r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\阿里巴巴张丽俊组织发展课程笔记分享 - 知乎.pdf"]
#     print(chat_system.load_document(file_paths))  # 注意：需要传入列表
    
   
#     # 第二步：基于大纲生成详细计划
#     detailed_plan = chat_system.chat("""阿里的企业文化是?
#     """)
    
#     print("\n详细培训计划：", detailed_plan)

# if __name__ == "__main__":
#     main()

# # 创建实例
