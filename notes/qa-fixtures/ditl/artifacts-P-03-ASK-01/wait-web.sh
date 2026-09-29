#!/usr/bin/env bash
# wait for expo web
i=0
while [ $i -lt 40 ]; do
  i=$((i+1))
  code=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8081/ || true)
  echo "try $i code=$code"
  if [ "$code" = "200" ] || [ "$code" = "304" ]; then
    exit 0
  fi
  sleep 3
done
exit 1
