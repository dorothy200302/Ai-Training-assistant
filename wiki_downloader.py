from pathlib import Path
import requests
import urllib.request
import re
from bs4 import BeautifulSoup

def get_wikipedia_images(title):
    """
    获取维基百科页面上的图片URL列表
    
    Args:
        title: 维基百科页面标题
        
    Returns:
        list: 图片URL列表
    """
    # 将空格替换为下划线，符合维基百科URL格式
    title_formatted = title.replace(" ", "_")
    
    # 获取维基百科页面内容
    url = f"https://en.wikipedia.org/wiki/{title_formatted}"
    response = requests.get(url)
    
    if response.status_code != 200:
        print(f"无法获取页面: {url}")
        return []
    
    # 使用BeautifulSoup解析HTML
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # 查找所有图片标签
    images = []
    for img in soup.find_all('img'):
        # 获取图片源URL
        src = img.get('src')
        if src:
            # 维基百科图片URL通常以//开头，需要添加https:
            if src.startswith('//'):
                src = 'https:' + src
            # 有些图片URL可能已经包含http或https
            elif not (src.startswith('http://') or src.startswith('https://')):
                # 相对URL，添加维基百科域名
                src = 'https://en.wikipedia.org' + ('' if src.startswith('/') else '/') + src
            
            # 过滤掉小图标和SVG图片
            if not (src.endswith('.svg') and 'icon' in src.lower()):
                images.append(src)
    
    return images

image_uuid = 0
# image_metadata_dict stores images metadata including image uuid, filename and path
image_metadata_dict = {}
MAX_IMAGES_PER_WIKI = 20

wiki_titles = {
    "Tesla Model Y",
    "Tesla Model X",
    "Tesla Model 3",
    "Tesla Model S",
    "Kia EV6",
    "BMW i3",
    "Audi e-tron",
    "Ford Mustang",
    "Porsche Taycan",
    "Rivian",
    "Polestar",
}


data_path = Path("mixed_wiki")
if not data_path.exists():
    Path.mkdir(data_path)

for title in wiki_titles:
    print(f"处理维基百科页面: {title}")
    response = requests.get(
        "https://en.wikipedia.org/w/api.php",
        params={
            "action": "query",
            "format": "json",
            "titles": title,
            "prop": "extracts",
            "explaintext": True,
        },
    ).json()
    page = next(iter(response["query"]["pages"].values()))
    wiki_text = page["extract"]

    with open(data_path / f"{title}.txt", "w", encoding="utf-8") as fp:
        fp.write(wiki_text)
    
    print(f"已保存文本内容到 {title}.txt")

    images_per_wiki = 0
    try:
        # 获取维基百科图片
        list_img_urls = get_wikipedia_images(title)
        print(f"找到 {len(list_img_urls)} 张图片")

        for url in list_img_urls:
            if (
                url.endswith(".jpg")
                or url.endswith(".png")
                or url.endswith(".svg")
            ):
                image_uuid += 1
                image_file_name = f"{image_uuid}.jpg"
                
                # 保存图片元数据
                image_metadata_dict[image_uuid] = {
                    "filename": image_file_name,
                    "path": str(data_path / image_file_name),
                    "source": title,
                    "url": url
                }
                
                try:
                    print(f"下载图片: {url}")
                    urllib.request.urlretrieve(
                        url, data_path / image_file_name
                    )
                    images_per_wiki += 1
                    # Limit the number of images downloaded per wiki page to MAX_IMAGES_PER_WIKI
                    if images_per_wiki >= MAX_IMAGES_PER_WIKI:
                        print(f"已达到每个维基页面的最大图片数量限制 ({MAX_IMAGES_PER_WIKI})")
                        break
                except Exception as e:
                    print(f"下载图片失败: {url}, 错误: {e}")
    except Exception as e:
        print(f"处理维基百科页面图片时出错: {title}, 错误: {e}")
        continue

print(f"总共下载了 {image_uuid} 张图片")
print(f"图片元数据: {image_metadata_dict}") 