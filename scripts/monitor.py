import requests
import time
import subprocess
import logging
import smtplib
from email.mime.text import MIMEText
from datetime import datetime
from pathlib import Path
from dev.config.settings import settings

# 配置日志
log_dir = Path("/home/ubuntu/logs")
log_dir.mkdir(exist_ok=True)
log_file = log_dir / "monitor.log"

logging.basicConfig(
    filename=str(log_file),
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

class ServiceMonitor:
    def __init__(self):
        self.service_name = "docgeneration"
        self.health_endpoint = "http://localhost:8000/health"
        self.check_interval = 300  # 5分钟
        self.failure_threshold = 3
        self.failure_count = 0

    def send_email_alert(self, subject, message):
        try:
            msg = MIMEText(message)
            msg['Subject'] = subject
            msg['From'] = settings.MAIL_USERNAME
            msg['To'] = settings.MAIL_DEFAULT_SENDER

            with smtplib.SMTP_SSL(settings.MAIL_SERVER, settings.MAIL_PORT) as server:
                server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
                server.send_message(msg)
            logging.info("Alert email sent successfully")
        except Exception as e:
            logging.error(f"Failed to send email alert: {str(e)}")

    def check_health(self):
        try:
            response = requests.get(self.health_endpoint, timeout=10)
            return response.status_code == 200
        except Exception as e:
            logging.error(f"Health check failed: {str(e)}")
            return False

    def restart_service(self):
        try:
            subprocess.run(['sudo', 'systemctl', 'restart', self.service_name], check=True)
            logging.info("Service restarted successfully")
            return True
        except subprocess.CalledProcessError as e:
            logging.error(f"Failed to restart service: {str(e)}")
            return False

    def monitor(self):
        logging.info("Starting service monitor...")
        while True:
            try:
                if not self.check_health():
                    self.failure_count += 1
                    logging.warning(f"Health check failed. Failure count: {self.failure_count}")

                    if self.failure_count >= self.failure_threshold:
                        message = f"Service is down at {datetime.now()}. Attempting restart..."
                        logging.error(message)
                        self.send_email_alert("Service Down Alert", message)

                        if self.restart_service():
                            self.failure_count = 0
                else:
                    self.failure_count = 0

                time.sleep(self.check_interval)
            except Exception as e:
                logging.error(f"Monitor error: {str(e)}")
                time.sleep(60)  # 出错后等待1分钟再继续

if __name__ == "__main__":
    monitor = ServiceMonitor()
    monitor.monitor() 