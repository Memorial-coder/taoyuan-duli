#!/usr/bin/env bash
set -euo pipefail

DURATION_SEC="${DURATION_SEC:-900}"
INTERVAL_SEC="${INTERVAL_SEC:-5}"
OUT_DIR="${OUT_DIR:-/tmp/taoyuan-perf-$(date +%Y%m%d-%H%M%S)}"
APP_CONTAINER="${APP_CONTAINER:-taoyuan}"
OPENRESTY_CONTAINER="${OPENRESTY_CONTAINER:-openresty}"

mkdir -p "$OUT_DIR"

log() {
  printf '[%s] %s\n' "$(date --iso-8601=seconds)" "$*" | tee -a "$OUT_DIR/collector.log"
}

run_snapshot() {
  local name="$1"
  shift
  {
    echo "### $(date --iso-8601=seconds) :: $name"
    "$@" || true
    echo
  } >> "$OUT_DIR/$name.log" 2>&1
}

capture_docker_logs() {
  local container="$1"
  local file="$2"
  if [ -z "$container" ] || [ "$container" = "none" ] || [ "$container" = "__none__" ]; then
    return
  fi
  {
    echo "### $(date --iso-8601=seconds)"
    if docker inspect "$container" >/dev/null 2>&1; then
      docker logs --since "${INTERVAL_SEC}s" "$container" || true
    else
      echo "container not found: $container"
    fi
  } >> "$OUT_DIR/$file" 2>&1
}

log "metrics output: $OUT_DIR"
log "duration=${DURATION_SEC}s interval=${INTERVAL_SEC}s app_container=${APP_CONTAINER}"

run_snapshot host-uname uname -a
run_snapshot host-uptime uptime
run_snapshot host-free free -h
run_snapshot host-df df -h
run_snapshot docker-ps docker ps --no-trunc
run_snapshot docker-compose docker compose ps

start_epoch="$(date +%s)"
end_epoch="$((start_epoch + DURATION_SEC))"

while [ "$(date +%s)" -lt "$end_epoch" ]; do
  ts="$(date --iso-8601=seconds)"
  {
    echo "### $ts"
    top -b -n 1 | head -40 || true
  } >> "$OUT_DIR/top.log" 2>&1

  {
    echo "### $ts"
    free -m || true
  } >> "$OUT_DIR/free.log" 2>&1

  {
    echo "### $ts"
    df -h || true
  } >> "$OUT_DIR/df.log" 2>&1

  {
    echo "### $ts"
    ss -s || true
    ss -tan state established '( sport = :4014 or dport = :4014 or sport = :4013 or dport = :4013 or sport = :443 or dport = :443 )' | head -200 || true
  } >> "$OUT_DIR/ss.log" 2>&1

  {
    echo "### $ts"
    docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}\t{{.PIDs}}' || true
  } >> "$OUT_DIR/docker-stats.log" 2>&1

  if command -v iostat >/dev/null 2>&1; then
    {
      echo "### $ts"
      iostat -xz 1 1 || true
    } >> "$OUT_DIR/iostat.log" 2>&1
  fi

  if command -v vmstat >/dev/null 2>&1; then
    {
      echo "### $ts"
      vmstat 1 2 || true
    } >> "$OUT_DIR/vmstat.log" 2>&1
  fi

  capture_docker_logs "$APP_CONTAINER" app-docker-logs.log
  capture_docker_logs "$OPENRESTY_CONTAINER" openresty-docker-logs.log

  sleep "$INTERVAL_SEC"
done

log "collection finished"
log "archive with: tar -czf ${OUT_DIR}.tar.gz -C $(dirname "$OUT_DIR") $(basename "$OUT_DIR")"
