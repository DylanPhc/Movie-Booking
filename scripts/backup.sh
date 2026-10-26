#!/bin/bash
# Dùng: ./scripts/backup.sh "<EXTERNAL_DATABASE_URL>"
mkdir -p backups
FILE="backups/movie_$(date +%Y%m%d_%H%M%S).sql"
pg_dump "$1" --no-owner --no-acl -f "$FILE"
echo "Đã backup ra $FILE"
