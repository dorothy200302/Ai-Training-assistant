
presign_url="https://agi-assets.s3.amazonaws.com/common/file/2024/11/12/some-files.pdf?AWSAccessKeyId=AKIAVPIYL5JWYC7W3IHZ&Signature=w3G8m6jLmTTTZBMt0kC4cJx2jZk%3D&content-type=application%2Fpdf&Expires=1731404407"
import requests



headers = {
    "Content-Type": "application/pdf"
}

# 上传文件
with open(r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\AI技术发现超16万种RNA病毒 阿里云联合研究成果发表于国际期刊《Cell》-阿里巴巴集团.pdf", "rb") as file:
    response = requests.put(presign_url, headers=headers, data=file)
    
print(response.status_code)
print(f"visit url: {presign_url.split('?')[0]}")

