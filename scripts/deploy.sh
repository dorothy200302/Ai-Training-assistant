#!/bin/bash

# 配置变量
APP_DIR="/home/ubuntu/training-doc/langchain1"
BACKUP_DIR="/home/ubuntu/backups"
LOG_FILE="/home/ubuntu/deploy.log"
VENV_PATH="$APP_DIR/venv"
SERVICE_NAME="docgeneration"

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
    echo "$1"
}

# 错误处理
handle_error() {
    log "Error: $1"
    exit 1
}

# 开始部署
log "Starting deployment..."

# 检查目录
cd "$APP_DIR" || handle_error "Failed to change to app directory"

# 创建备份
BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
log "Creating backup: $BACKUP_NAME"
mkdir -p "$BACKUP_DIR"
cp -r "$APP_DIR" "$BACKUP_DIR/$BACKUP_NAME" || handle_error "Backup failed"

# 拉取最新代码
log "Pulling latest code..."
git pull origin main || handle_error "Git pull failed"

# 激活虚拟环境并更新依赖
log "Updating dependencies..."
source "$VENV_PATH/bin/activate" || handle_error "Failed to activate virtual environment"
pip install -r requirements.txt || handle_error "Failed to install dependencies"

# 重启服务
log "Restarting service..."
sudo systemctl restart "$SERVICE_NAME" || handle_error "Failed to restart service"

# 检查服务状态
sleep 5
if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
    log "Deployment successful!"
else
    log "Service failed to start. Rolling back..."
    cp -r "$BACKUP_DIR/$BACKUP_NAME"/* "$APP_DIR/"
    sudo systemctl restart "$SERVICE_NAME"
    handle_error "Deployment failed, rolled back to previous version"
fi 