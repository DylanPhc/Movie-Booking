#!/bin/bash
# Dùng: ./scripts/restore.sh "<EXTERNAL_URL_DB_MOI>" backups/file.sql
psql "$1" -f "$2"
echo "Đã khôi phục từ $2"
