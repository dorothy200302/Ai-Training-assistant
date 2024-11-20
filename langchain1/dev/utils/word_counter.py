import pdfplumber
from pathlib import Path

def count_words_in_files(file_paths: list) -> dict:
    """统计指定文件列表的字数"""
    results = []
    total_words = 0
    
    for file_path in file_paths:
        try:
            path = Path(file_path)
            word_count = 0
            
            if path.suffix.lower() == '.pdf':
                with pdfplumber.open(path) as pdf:
                    text = ''
                    for page in pdf.pages:
                        text += page.extract_text() or ''
                    word_count = len(text)
                    
            elif path.suffix.lower() in ['.html']:
                with open(path, 'r', encoding='utf-8') as f:
                    text = f.read()
                    word_count = len(text)
            
            total_words += word_count
            results.append({
                "file_name": path.name,
                "word_count": word_count,
                "path": str(path)
            })
            
        except Exception as e:
            results.append({
                "file_name": Path(file_path).name,
                "error": str(e),
                "path": str(file_path)
            })
    
    return {
        "files": results,
        "total_words": total_words,
        "file_count": len(results)
    }

if __name__ == "__main__":
    file_paths = [
        r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we approach marketing · Resend.pdf",
        r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we evolve our knowledge base · Resend.pdf",
        r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we help users · Resend.pdf",
        r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we think about design · Resend.pdf",
        r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we approach CI_CD · Resend.html",
        r".venv/share/How we receive feedback · Resend.pdf",
        r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we scale support · Resend.pdf",
        r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we think about design · Resend.pdf",
        r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we think about swag · Resend.pdf",
       
    ]
    
    results = count_words_in_files(file_paths)
    
    print(f"\n总文件数: {results['file_count']}")
    print(f"总字数: {results['total_words']}")
    print("\n各文件详细统计:")
    
    for file_info in results['files']:
        if 'error' in file_info:
            print(f"\n文件: {file_info['file_name']}")
            print(f"错误: {file_info['error']}")
        else:
            print(f"\n文件: {file_info['file_name']}")
            print(f"字数: {file_info['word_count']}") 