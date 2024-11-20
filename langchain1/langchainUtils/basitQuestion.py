# langchain_utils.py

from langchain import OpenAI, LLMChain

# 初始化 LangChain LLM
llm = OpenAI(temperature=0.7)

def generate_itinerary(preferences):
    """
    根据用户的旅行偏好生成行程
    :param preferences: 用户输入的旅行偏好
    :return: 生成的行程建议
    """
    prompt = f"根据以下偏好生成旅行行程: {preferences}"
    chain = LLMChain(llm=llm, prompt=prompt)
    response = chain.run()
    return response

def get_answer(question):
    """
    获取用户旅行相关问题的答案
    :param question: 用户的问题
    :return: LLM 的回答
    """
    prompt = f"回答以下旅行相关问题: {question}"
    chain = LLMChain(llm=llm, prompt=prompt)
    response = chain.run()
    return response

def optimize_itinerary(itinerary):
    """
    优化用户输入的行程
    :param itinerary: 用户输入的行程
    :return: 优化后的行程
    """
    prompt = f"请优化以下行程: {itinerary}"
    chain = LLMChain(llm=llm, prompt=prompt)
    response = chain.run()
    return response
