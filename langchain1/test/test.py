import os
from openai import OpenAI

client = OpenAI(
    api_key="as-D73mmid1JVABYjxT4_ncuw",
    base_url="https://gateway.agione.ai/openai/api/v2"
)

completion = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Hello! How are you?"}
    ]
)
print(completion.choices[0].message.content)
