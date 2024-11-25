#!/bin/bash

# 配置变量
APP_DIR="/home/ubuntu/training-doc/langchain1"
BACKUP_ROOT="/home/ubuntu/backups"
DB_NAME="doc_generator"
DB_USER="root"
DB_PASS="123456"
RETENTION_DAYS=7
LOG_FILE="/home/ubuntu/backup.log"

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

# 创建备份目录
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$BACKUP_ROOT/backup_$TIMESTAMP"
mkdir -p "$BACKUP_DIR" || handle_error "Failed to create backup directory"

# 备份代码
log "Backing up code..."
cp -r "$APP_DIR" "$BACKUP_DIR/code" || handle_error "Failed to backup code"

# 备份数据库
log "Backing up database..."
mysqldump -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" > "$BACKUP_DIR/database.sql" || handle_error "Failed to backup database"

# 压缩备份
log "Compressing backup..."
cd "$BACKUP_ROOT" || handle_error "Failed to change directory"
tar -czf "backup_$TIMESTAMP.tar.gz" "backup_$TIMESTAMP" || handle_error "Failed to compress backup"
rm -rf "backup_$TIMESTAMP"

# 清理旧备份
log "Cleaning old backups..."
find "$BACKUP_ROOT" -name "backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete

# 检查备份大小
BACKUP_SIZE=$(du -sh "$BACKUP_ROOT/backup_$TIMESTAMP.tar.gz" | cut -f1)
log "Backup completed successfully. Size: $BACKUP_SIZE"

# 可选：上传到远程存储
# 如果有需要，可以添加将备份上传到S3或其他远程存储的代码 