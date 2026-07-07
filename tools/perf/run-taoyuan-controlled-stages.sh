#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
K6_SCRIPT="${K6_SCRIPT:-$SCRIPT_DIR/taoyuan-k6.js}"
K6_BIN="${K6_BIN:-k6}"
K6_DOCKER_IMAGE="${K6_DOCKER_IMAGE:-grafana/k6:latest}"
OUT_DIR="${OUT_DIR:-/tmp/taoyuan-k6-$(date +%Y%m%d-%H%M%S)}"

BASE_URL="${BASE_URL:-https://taoyuanxiang.ymzcc.com}"
DIRECT_URL="${DIRECT_URL:-http://127.0.0.1:4014}"
STAGE_USERS="${STAGE_USERS:-1,10,30,50,80,100}"
STAGE_DURATION="${STAGE_DURATION:-2m}"
STAGE_DURATIONS="${STAGE_DURATIONS:-1:2m,10:2m,30:2m,50:2m,80:2m,100:3m}"
COOLDOWN_SEC="${COOLDOWN_SEC:-30}"

COLD_STATIC="${COLD_STATIC:-true}"
INCLUDE_WS="${INCLUDE_WS:-true}"
INCLUDE_WRITES="${INCLUDE_WRITES:-false}"
INCLUDE_ANNOUNCEMENT_EVENTS="${INCLUDE_ANNOUNCEMENT_EVENTS:-false}"
ANNOUNCEMENT_EVENT_LIMIT="${ANNOUNCEMENT_EVENT_LIMIT:-30}"
CLIENT_VERSION="${CLIENT_VERSION:-3.0.0}"
CLIENT_CHANNEL="${CLIENT_CHANNEL:-web}"
THINK_MIN_MS="${THINK_MIN_MS:-500}"
THINK_MAX_MS="${THINK_MAX_MS:-1500}"
WS_HOLD_MS="${WS_HOLD_MS:-30000}"

mkdir -p "$OUT_DIR"

log() {
  printf '[%s] %s\n' "$(date --iso-8601=seconds)" "$*" | tee -a "$OUT_DIR/run.log"
}

stage_duration_for() {
  local vus="$1"
  local item key value
  IFS=',' read -r -a items <<< "$STAGE_DURATIONS"
  for item in "${items[@]}"; do
    key="${item%%:*}"
    value="${item#*:}"
    if [[ "$item" == *:* && "$key" == "$vus" && -n "$value" ]]; then
      printf '%s\n' "$value"
      return
    fi
  done
  printf '%s\n' "$STAGE_DURATION"
}

load_users_json() {
  if [[ -n "${USERS_JSON:-}" ]]; then
    printf '%s\n' "$USERS_JSON"
    return
  fi
  if [[ -n "${USERS_JSON_FILE:-}" ]]; then
    tr -d '\n' < "$USERS_JSON_FILE"
    return
  fi
  printf '[]\n'
}

if [[ ! -f "$K6_SCRIPT" ]]; then
  log "k6 script not found: $K6_SCRIPT"
  exit 2
fi

detect_k6_mode() {
  if command -v "$K6_BIN" >/dev/null 2>&1; then
    printf 'binary\n'
    return
  fi
  if command -v docker >/dev/null 2>&1; then
    printf 'docker\n'
    return
  fi
  printf 'missing\n'
}

K6_MODE="$(detect_k6_mode)"
if [[ "$K6_MODE" == "missing" ]]; then
  log "k6 binary '$K6_BIN' was not found and Docker is unavailable."
  exit 127
fi
log "k6 execution mode: $K6_MODE"

USERS_JSON_VALUE="$(load_users_json)"
if [[ -n "${USERS_JSON:-}" ]]; then
  USERS_SOURCE="env"
elif [[ -n "${USERS_JSON_FILE:-}" ]]; then
  USERS_SOURCE="file"
else
  USERS_SOURCE="none"
fi

cat > "$OUT_DIR/test-config.json" <<EOF
{
  "generated_at": "$(date --iso-8601=seconds)",
  "base_url": "$BASE_URL",
  "direct_url": "$DIRECT_URL",
  "stage_users": "$STAGE_USERS",
  "stage_durations": "$STAGE_DURATIONS",
  "cold_static": "$COLD_STATIC",
  "include_ws": "$INCLUDE_WS",
  "include_writes": "$INCLUDE_WRITES",
  "include_announcement_events": "$INCLUDE_ANNOUNCEMENT_EVENTS",
  "announcement_event_limit": "$ANNOUNCEMENT_EVENT_LIMIT",
  "users_source": "$USERS_SOURCE"
}
EOF

log "output directory: $OUT_DIR"
log "base_url=$BASE_URL direct_url=$DIRECT_URL users=$STAGE_USERS"

run_k6_stage() {
  local vus="$1"
  local duration="$2"
  local stage_dir="$3"

  if [[ "$K6_MODE" == "binary" ]]; then
    USERS_JSON="$USERS_JSON_VALUE" "$K6_BIN" run \
      --summary-export "$stage_dir/summary.json" \
      --out "json=$stage_dir/k6-samples.ndjson" \
      -e TEST_MODE=constant \
      -e VUS="$vus" \
      -e DURATION="$duration" \
      -e BASE_URL="$BASE_URL" \
      -e DIRECT_URL="$DIRECT_URL" \
      -e COLD_STATIC="$COLD_STATIC" \
      -e INCLUDE_WS="$INCLUDE_WS" \
      -e INCLUDE_WRITES="$INCLUDE_WRITES" \
      -e INCLUDE_ANNOUNCEMENT_EVENTS="$INCLUDE_ANNOUNCEMENT_EVENTS" \
      -e ANNOUNCEMENT_EVENT_LIMIT="$ANNOUNCEMENT_EVENT_LIMIT" \
      -e CLIENT_VERSION="$CLIENT_VERSION" \
      -e CLIENT_CHANNEL="$CLIENT_CHANNEL" \
      -e THINK_MIN_MS="$THINK_MIN_MS" \
      -e THINK_MAX_MS="$THINK_MAX_MS" \
      -e WS_HOLD_MS="$WS_HOLD_MS" \
      "$K6_SCRIPT"
    return
  fi

  local script_dir script_name
  script_dir="$(cd "$(dirname "$K6_SCRIPT")" && pwd)"
  script_name="$(basename "$K6_SCRIPT")"
  local users_args=()
  if [[ -n "${USERS_JSON:-}" ]]; then
    users_args=(-e USERS_JSON="$USERS_JSON_VALUE")
  elif [[ -n "${USERS_JSON_FILE:-}" ]]; then
    local users_dir users_name
    users_dir="$(cd "$(dirname "$USERS_JSON_FILE")" && pwd)"
    users_name="$(basename "$USERS_JSON_FILE")"
    users_args=(-v "$users_dir:/users:ro" -e USERS_JSON_FILE="/users/$users_name")
  else
    users_args=(-e USERS_JSON="$USERS_JSON_VALUE")
  fi
  docker run --rm --network host --user 0:0 \
    -v "$script_dir:/scripts:ro" \
    -v "$OUT_DIR:$OUT_DIR" \
    "${users_args[@]}" \
    "$K6_DOCKER_IMAGE" run \
      --summary-export "$stage_dir/summary.json" \
      --out "json=$stage_dir/k6-samples.ndjson" \
      -e TEST_MODE=constant \
      -e VUS="$vus" \
      -e DURATION="$duration" \
      -e BASE_URL="$BASE_URL" \
      -e DIRECT_URL="$DIRECT_URL" \
      -e COLD_STATIC="$COLD_STATIC" \
      -e INCLUDE_WS="$INCLUDE_WS" \
      -e INCLUDE_WRITES="$INCLUDE_WRITES" \
      -e INCLUDE_ANNOUNCEMENT_EVENTS="$INCLUDE_ANNOUNCEMENT_EVENTS" \
      -e ANNOUNCEMENT_EVENT_LIMIT="$ANNOUNCEMENT_EVENT_LIMIT" \
      -e CLIENT_VERSION="$CLIENT_VERSION" \
      -e CLIENT_CHANNEL="$CLIENT_CHANNEL" \
      -e THINK_MIN_MS="$THINK_MIN_MS" \
      -e THINK_MAX_MS="$THINK_MAX_MS" \
      -e WS_HOLD_MS="$WS_HOLD_MS" \
      "/scripts/$script_name"
}

IFS=',' read -r -a stages <<< "$STAGE_USERS"
for raw_vus in "${stages[@]}"; do
  vus="$(printf '%s' "$raw_vus" | tr -d '[:space:]')"
  if [[ -z "$vus" ]]; then
    continue
  fi
  if [[ ! "$vus" =~ ^[0-9]+$ || "$vus" -lt 1 ]]; then
    log "invalid stage VUs value: $vus"
    exit 2
  fi
  duration="$(stage_duration_for "$vus")"
  stage_dir="$OUT_DIR/stage-${vus}"
  mkdir -p "$stage_dir"

  started_at="$(date --iso-8601=seconds)"
  cat > "$stage_dir/stage.json" <<EOF
{
  "vus": $vus,
  "duration": "$duration",
  "started_at": "$started_at",
  "status": "running"
}
EOF

  log "starting stage vus=$vus duration=$duration"
  set +e
  run_k6_stage "$vus" "$duration" "$stage_dir" 2>&1 | tee "$stage_dir/k6-output.log"
  status="${PIPESTATUS[0]}"
  set -e

  finished_at="$(date --iso-8601=seconds)"
  if [[ "$status" -eq 0 ]]; then
    stage_status="passed"
  else
    stage_status="failed"
  fi
  cat > "$stage_dir/stage.json" <<EOF
{
  "vus": $vus,
  "duration": "$duration",
  "started_at": "$started_at",
  "finished_at": "$finished_at",
  "status": "$stage_status",
  "exit_code": $status
}
EOF

  log "finished stage vus=$vus status=$stage_status exit_code=$status"
  if [[ "$status" -ne 0 ]]; then
    log "stopping because k6 thresholds or runtime failed at vus=$vus"
    exit "$status"
  fi

  if [[ "$COOLDOWN_SEC" -gt 0 ]]; then
    log "cooldown ${COOLDOWN_SEC}s"
    sleep "$COOLDOWN_SEC"
  fi
done

log "all stages completed"
log "archive with: tar -czf ${OUT_DIR}.tar.gz -C $(dirname "$OUT_DIR") $(basename "$OUT_DIR")"
