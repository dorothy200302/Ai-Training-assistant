from pydantic_settings import BaseSettings
from typing import Optional, Dict
import secrets

class Settings(BaseSettings):
    # 数据库配置
    DB_DRIVER: str = "mysql+pymysql"
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_NAME: str = "doc_generator"
    DB_USER: str = "root"
    DB_PASSWORD: str = "123456"
    
    # Redis配置
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    
    # 邮件配置
    MAIL_SERVER: str = "smtp.163.com"
    MAIL_PORT: int = 465
    MAIL_USERNAME: str = "18061613931@163.com"
    MAIL_PASSWORD: str = "VFkAeTxhAJFgLnmM"
    MAIL_USE_SSL: bool = True
    MAIL_DEFAULT_SENDER: str = "18061613931@163.com"
    
    # 文件上传配置
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    MAX_REQUEST_SIZE: int = 100 * 1024 * 1024  # 100MB
    
    # 线程池配置
    THREAD_POOL_CORE_SIZE: int = 10
    THREAD_POOL_MAX_SIZE: int = 50
    THREAD_POOL_QUEUE_CAPACITY: int = 100

    SECRET_KEY: str = secrets.token_hex(32)
    
    # Redis settings
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    
    # Token settings
    LOGIN_USER_KEY: str = "login:token:"
    LOGIN_USER_TTL: int = 60  # minutes
    
    # Alipay Configuration
    ALIPAY_CONFIG: Dict[str, str] = {
        "APP_ID": "2021005108606872",
        "APP_PRIVATE_KEY": """MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCdiXzsYvaaKvuS6+KK3D5QBLdYilx9tGDN12ylS7Sh/jk86tdv8Hb2Ld5tq5pqlnxNqyxbtyulkPqyxbicYmYAqTSvUAGfkNnlfBXDFcglJpcE2LcyB+yGNuQ3XyikV03cEdZIfP3pVkS8NKRSpcotM0hvGV6eyJpYrU/RITtDP6J9KCTLFku2RTEcpr4oKDVPGRXoKNj6P/CE6PnZir5b4AhL8Aq0nYRu1UvJxLNoL3oOICiFv1w7DPQSU1bIArPWtTeZvBj2v7KqTLAgdl8C0LzL8dFju3yPwZYWgYbUb3GfJs0ENJlJOaV4HCNGIz9T1O3Apni5hb+s7egQ6eCorAgMBAAECggEAJH6LL/+k/QXkDZ8TdfObg9Hz31D+KCi3HDhBdPFawQQxokkM62ObS2BI3MMaHIML/LogqraM5qoWO2w3Jl248RO7iXsmlhmAeGC8RSErwaHiZnipnZrdpQUvjcPJTMMWGTRbS13bKyNc8QGJRc/BMWSjBomb0Yta0mK6fl2zxdXQ9uV1nXSJEA7uNHwg0letuZ5q29JRw8qzDJCBjAnCPuTWEsNER/cmzWgclOlyacTVLQFtLm2DoI+QoxEbfQ6P+svmLFT64TqU740kj3c5zt+UacBCmwYC5UurylAGXM3HSDL3C0+7SyzyzA3856XKwo3yO9znHuAcNc3Wfsf+EQKBgQDzpx5iekxZwq9UAkpvz+kDa6YCRJs+bqNHhuKoMfDOD6iwKNhFYafOp8dS7q37xwgtKDJ2WoJeRPQuaFuX92IBAAC6mSKAS0PK7dxIIis7MwoMa6NAFjCXPTAZ0dM/qVD6arBNP2IseX5QfWOS6cWH8o24niIRYQ3V3g0owNCkbwKBgQClhTL5hfQDDZOAq5aFH+4EUWFOY2okJVGV5M5DaAfk2prt8ZiQhinTVULhWxJSU7BH142SvKiG17wNRLH5Jwlg6Jct7CltXL5aZj78tYRxtOwIsoeSiQPW3wG8x2BYs1OLfLflKa9lsKB9P7V7xO82pUAzjUDGo0AA9pl4JaxMBQKBgA9B/90a230je+c+3XpzApx8OUEbGr2mIANypu7xcar1wBKH/EMcAm4mg4zl9W8234Q0aDSRJmjQ2JmvX0z86N43KdSFkmuGSxCCJLE/soVahN6SPv7cZN6TrldvlFMAP1nvJGsx9OvkD8zqjTm9+eixf7536Jo+AafK5/gNWwNxAoGAMzYsGGHmpo8rxRLR5myDoxhex/cgXwCg5oS9gMOONbOhXd9zObwY8scdg0Y/O/OixgeeSPlQFzBmgaBwhEscrrwoElBQXQLl7mhWMrAiw1+b6/D421DDPFcRXYw+dhM91RmIeEHWf9sPPNFaYGoFLV4hqBGbKhpWcjXaM/9L+NUCgYEAl3SApDmsxiOKq8XUh1XwkM1ckSarB+fRqtgaFEfzlQIh9miUU1Bgoz+/x3ybkWmOlbOXpukELrAigVVH4LKb4ybXw9Wp6aufDcjiwLuycJTl4LPq0Skxq+sMkvVzizjSBW3CVjwYBCjlfomx7JXbrIVZHvujIps+652VjaScuFo=""",
        "ALIPAY_PUBLIC_KEY": """MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnYl87GL2mir7kuviitw+UAS3WIpcfbRgzddspUu0of45POrXb/B29i3ebauaapZ8TassbcrpZD6ssW4nGJmAKk0r1ABn5DZ5XwVwxXIJSaXBNi3MgfshjbkN18opFdN3BHWSHz96VZEvDSkUqXKLTNIbxlensiaWK1P0SE7Qz+ifSgkyxZLtkUxHKa+KCg1TxkV6CjY+j/whOj52Yq+W+AIS/AKtJ2EbtVLycSzaC96DiAohb9cOwz0ElNWyAKz1rU3mbwY9r+yqkywIHZfAtC8y/HRY7t8j8GWFoGG1G9xnybNBDSZSTmleBwjRiM/U9TtwKZ4uYW/rO3oEOngqKwIDAQAB""",
        "NOTIFY_URL": "http://huopeixun.com/api/payment/notify",  # 替换为你的域名
        "RETURN_URL": "http://localhost:3000/payment/success"
    }

    class Config:
        env_file = ".env"
        extra = "allow"  # This allows extra fields from environment variables

settings = Settings()