from setuptools import setup, find_packages

setup(
    name="dev",
    version="0.1",
    packages=find_packages(),
    install_requires=[
        "sqlalchemy",
        "passlib",
        "bcrypt",
        "python-jose",
        "python-multipart",
        "fastapi",
        "uvicorn",
        "langchain",
        "openai",
    ],
)