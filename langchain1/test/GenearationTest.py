model_list=["grok-beta","gpt-4o-mini"]
for model_name in model_list:
     background_informations = {
        "audience_info": "主要受众:abc集团新入职员工,受众特点:年轻化，学历高，学习能力强",
        "company_name": "123",
        "company_culture": "客户第一，团队合作，拥抱变化，诚信，激情，敬业",
        "company_industry": "互联网",
        "company_competition": "行业领先",
        "user_role": "市场营销经理",
        "industry_info": "互联网",
        "project_title": "市场营销经理",
        "project_dutys": "负责公司市场营销策略的制定和执行",
        "project_goals": "了解公司市场营销策略的制定和执行",
        "project_theme": "了解公司市场营销策略的制定和执行",
        "project_aim": "了解公司市场营销策略的制定和执行",
        "content_needs": "市场营销策略的制定和执行",
        "format_style": " "
    }
    
     file_paths = [
        r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we approach marketing · Resend.pdf",
        r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we evolve our knowledge base · Resend.pdf",
        r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we help users · Resend.pdf",
        r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we think about design · Resend.pdf",
        r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we approach CI_CD · Resend.html",
    ]
    g = AsyncTrainingDocGenerator(file_paths=file_paths, model_name=model_name, background_informations=background_informations)
