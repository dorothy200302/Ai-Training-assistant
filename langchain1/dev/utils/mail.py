import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
import os
import logging
import json
from config.settings import settings
from typing import List, Optional
from pathlib import Path
from fastapi import HTTPException

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.host = settings.MAIL_SERVER
        self.port = settings.MAIL_PORT
        self.username = settings.MAIL_USERNAME
        self.password = settings.MAIL_PASSWORD
        self.default_sender = settings.MAIL_DEFAULT_SENDER

    def send_email(
        self,
        to_email: str,
        subject: str,
        body: str,
        attachments: Optional[List[Path]] = None,
        html: bool = False
    ):
        try:
            msg = MIMEMultipart()
            msg['From'] = self.default_sender
            msg['To'] = to_email
            msg['Subject'] = subject

            # 添加邮件正文
            content_type = 'html' if html else 'plain'
            msg.attach(MIMEText(body, content_type, 'utf-8'))

            # 添加附件
            if attachments:
                for file_path in attachments:
                    with open(file_path, 'rb') as f:
                        part = MIMEApplication(f.read())
                        part.add_header(
                            'Content-Disposition',
                            'attachment',
                            filename=file_path.name
                        )
                        msg.attach(part)

            # 连接并发送
            with smtplib.SMTP_SSL(self.host, self.port) as server:
                server.login(self.username, self.password)
                server.send_message(msg)
                
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to send email: {str(e)}"
            )

    def send_verification_code(self, email: str, code: str):
        subject = "验证码"
        body = f"""
        <h2>您的验证码是：{code}</h2>
        <p>验证码有效期为5分钟，请尽快使用。</p>
        """
        return self.send_email(email, subject, body, html=True)