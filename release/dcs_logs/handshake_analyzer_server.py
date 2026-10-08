import os
import re
import sys
import glob
import shutil
import csv
import io
from datetime import datetime
from collections import defaultdict
from typing import List, Dict, Any, Optional, Tuple

import uvicorn
from fastapi import FastAPI, Query, HTTPException, File, UploadFile
from fastapi.responses import Response, PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="PLC-mWCS Handshake Analysis Engine", version="1.0.0")

# Enable CORS for local development and UI integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

LOG_DIR = os.environ.get("DCS_LOG_DIR", os.path.dirname(os.path.abspath(__file__)))

class HandshakeRecord:
    def __init__(
        self, 
        hid: str, 
        file_name: str, 
        station: str, 
        substation: str,
        cycle_id: str,
        attempt_number: int
    ):
        self.id = hid
        self.cycle_id = cycle_id
        self.attempt_number = attempt_number
        self.is_retry = (attempt_number > 1)
        self.file_name = file_name
        self.station = station
        self.substation = substation
        self.pallet_id: str = "UNKNOWN"
        self.start_time: str = ""
        self.end_time: str = ""
        self.cycle_start_time: Optional[str] = None
        self.cycle_end_time: Optional[str] = None
        self.arrival_time: Optional[str] = None
        self.status: str = "PENDING_TRANSFER"  # SUCCESS or FAILED
        self.failure_reason: Optional[str] = None
        self.destination: Optional[str] = None
        self.dwell_duration_ms: Optional[int] = None
        self.protocol_duration_ms: Optional[int] = None
        self.discharge_duration_ms: Optional[int] = None
        self.cycle_duration_ms: Optional[int] = None
        self.events: List[Dict[str, Any]] = []

    def to_dict(self, include_events: bool = False) -> Dict[str, Any]:
        d = {
            "id": self.id,
            "cycle_id": self.cycle_id,
            "attempt_number": self.attempt_number,
            "is_retry": self.is_retry,
            "file_name": self.file_name,
            "station": self.station,
            "substation": self.substation,
            "pallet_id": self.pallet_id,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "cycle_start_time": self.cycle_start_time,
            "cycle_end_time": self.cycle_end_time,
            "arrival_time": self.arrival_time,
            "status": self.status,
            "failure_reason": self.failure_reason,
            "destination": self.destination,
            "dwell_duration_ms": self.dwell_duration_ms,
            "protocol_duration_ms": self.protocol_duration_ms,
            "discharge_duration_ms": self.discharge_duration_ms,
            "cycle_duration_ms": self.cycle_duration_ms,
            "event_count": len(self.events)
        }
        if include_events:
            d["events"] = self.events
        return d

# Global in-memory index
GLOBAL_RECORDS: List[HandshakeRecord] = []
RECORDS_BY_ID: Dict[str, HandshakeRecord] = {}
INDEXED_FILES: Dict[str, Dict[str, Any]] = {}
STATION_TAG_EVENTS: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
ALL_DETECTED_STATIONS: List[str] = []

def parse_log_file(filepath: str) -> Tuple[List[HandshakeRecord], Dict[str, List[Dict[str, Any]]]]:
    filename = os.path.basename(filepath)
    records: List[HandshakeRecord] = []
    station_tag_events = defaultdict(list)
    line_num = 0

    # Track station pallet cycles and attempts
    station_cycles = defaultdict(lambda: {
        'cycle_index': 0,
        'current_cycle_id': None,
        'cycle_pallet': None,
        'pallet_id': None,
        'cycle_start_ts': None,
        'handshake_end_ts': None,
        'attempts': [],
        'current_attempt': None,
        'state': None,
        'events': [],
        'dest_val': None
    })

    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            line_num += 1
            line_str = line.strip()
            if not line_str:
                continue

            m_tag = re.match(r'\[(.*?)\] Tag (Read|Write.*?)\s+([\w\.\-]+)(?:\s*:\s*(.*))?', line_str)
            m_msg = re.match(r'\[(.*?)\] (.*)', line_str) if not m_tag else None

            if m_tag:
                ts_str, op, full_tag, val_str = m_tag.groups()
                val_str = (val_str or '').strip()
                parts = full_tag.split('.')
                station = parts[0]
                substation = parts[1] if len(parts) > 1 else ''
                tag_name = parts[2] if len(parts) > 2 else substation
                st_key = station

                # Record tag event for Station Tag Inspector
                tag_event_item = {
                    'id': f"{filename}:{line_num}",
                    'timestamp': ts_str,
                    'station': station,
                    'substation': substation,
                    'tag_name': tag_name,
                    'full_tag': full_tag,
                    'direction': 'WRITE' if 'Write' in op else 'READ',
                    'value': val_str,
                    'file': filename,
                    'line_num': line_num
                }
                station_tag_events[station].append(tag_event_item)

                ctx = station_cycles[st_key]
                evt = {
                    'ts': ts_str,
                    'direction': 'WRITE' if 'Write' in op else 'READ',
                    'tag': full_tag,
                    'name': tag_name,
                    'val': val_str
                }
                ctx['events'].append(evt)
                if len(ctx['events']) > 200:
                    ctx['events'] = ctx['events'][-120:]

                # 1. Point 1: Pallet Tracking & Cycle Start
                if 'Pallet_ID' in tag_name and val_str:
                    if val_str not in ['0', '0000000000', '']:
                        if ctx['pallet_id'] != val_str:
                            ctx['pallet_id'] = val_str
                            if ctx['state'] in [4, 5] and not ctx['cycle_start_ts']:
                                ctx['cycle_start_ts'] = ts_str

                # 2. State Tracking, Mid-Cycle Faults, and Point 4 Cycle End
                if tag_name == 'State':
                    try:
                        s_val = int(val_str)
                        old_s = ctx['state']
                        ctx['state'] = s_val

                        # Point 1: State 4 or 5 with Pallet ID -> Cycle Start Point
                        if s_val in [4, 5] and ctx['pallet_id'] and not ctx['cycle_start_ts']:
                            ctx['cycle_start_ts'] = ts_str

                        # Point 4: Return to State 1 after Transfer (State 8) -> Cycle End Point
                        if s_val == 1 and old_s in [8, 2]:
                            if ctx['current_attempt'] and ctx['current_attempt'].status == 'PENDING_TRANSFER':
                                ctx['current_attempt'].status = 'SUCCESS'
                                ctx['current_attempt'].end_time = ts_str
                                ctx['current_attempt'].cycle_end_time = ts_str
                                if ctx['cycle_start_ts']:
                                    try:
                                        t_s = datetime.strptime(ctx['cycle_start_ts'], '%Y-%m-%d %H:%M:%S.%f')
                                        t_e = datetime.strptime(ts_str, '%Y-%m-%d %H:%M:%S.%f')
                                        ctx['current_attempt'].cycle_duration_ms = max(0, int((t_e - t_s).total_seconds() * 1000))
                                    except Exception:
                                        pass
                                if ctx['handshake_end_ts']:
                                    try:
                                        t_hs = datetime.strptime(ctx['handshake_end_ts'], '%Y-%m-%d %H:%M:%S.%f')
                                        t_e = datetime.strptime(ts_str, '%Y-%m-%d %H:%M:%S.%f')
                                        ctx['current_attempt'].discharge_duration_ms = max(0, int((t_e - t_hs).total_seconds() * 1000))
                                    except Exception:
                                        pass
                                ctx['current_attempt'].events = list(ctx['events'][-35:])
                                records.append(ctx['current_attempt'])
                                ctx['current_attempt'] = None
                                ctx['attempts'] = []
                                ctx['current_cycle_id'] = None
                                ctx['cycle_pallet'] = None
                                ctx['cycle_start_ts'] = None
                                ctx['handshake_end_ts'] = None

                        # Gap-2: If station faults (State=16) during or after handshake before physical transfer
                        if s_val == 16:
                            if ctx['current_attempt'] and ctx['current_attempt'].status != 'FAILED':
                                ctx['current_attempt'].status = 'FAILED'
                                ctx['current_attempt'].failure_reason = 'MID_CYCLE_FAULT (State=16 during transfer)'
                                ctx['current_attempt'].end_time = ts_str
                    except ValueError:
                        pass

                # 3. Fault & Abort Diagnostics
                if tag_name == 'PLC_Error_No':
                    try:
                        err_no = int(val_str)
                        if err_no > 0 and ctx['current_attempt'] and ctx['current_attempt'].status != 'FAILED':
                            ctx['current_attempt'].status = 'FAILED'
                            ctx['current_attempt'].failure_reason = f'PLC_FAULT (Code {err_no})'
                            ctx['current_attempt'].end_time = ts_str
                    except ValueError:
                        pass
                elif tag_name == 'Abort' and val_str == '1':
                    if ctx['current_attempt'] and ctx['current_attempt'].status != 'FAILED':
                        ctx['current_attempt'].status = 'FAILED'
                        ctx['current_attempt'].failure_reason = 'ABORT_SIGNAL'
                        ctx['current_attempt'].end_time = ts_str

                # 4. Destination Assignment
                if tag_name == 'Destination' and val_str and val_str != '0':
                    ctx['dest_val'] = val_str
                    if ctx['current_attempt']:
                        ctx['current_attempt'].destination = val_str

                # 5. Handshake Protocol: Point 2 (Req=1) & Point 3 (Req=0)
                if tag_name == 'Request_For_Destination':
                    if val_str == '1':
                        current_pal = ctx['pallet_id'] or 'UNKNOWN'
                        is_same_cycle = False
                        if ctx['current_cycle_id']:
                            if ctx['cycle_pallet'] == current_pal and current_pal not in ['UNKNOWN', '1111111111']:
                                is_same_cycle = True

                        # If previous attempt existed without completing transfer, it was aborted/retried!
                        if ctx['current_attempt']:
                            if ctx['current_attempt'].status == 'PENDING_TRANSFER':
                                ctx['current_attempt'].status = 'FAILED'
                                ctx['current_attempt'].failure_reason = f"RETRY_ABORTED (Retried as Attempt {len(ctx['attempts']) + 1})"
                                ctx['current_attempt'].end_time = ts_str
                            ctx['current_attempt'].events = list(ctx['events'][-35:])
                            records.append(ctx['current_attempt'])
                            ctx['current_attempt'] = None

                        if is_same_cycle:
                            attempt_num = len(ctx['attempts']) + 1
                        else:
                            ctx['cycle_index'] += 1
                            ctx['current_cycle_id'] = f"{filename}_{station}_C{ctx['cycle_index']}"
                            ctx['cycle_pallet'] = current_pal
                            ctx['attempts'] = []
                            attempt_num = 1
                            if not ctx['cycle_start_ts']:
                                ctx['cycle_start_ts'] = ts_str

                        rec_id = f"{ctx['current_cycle_id']}_A{attempt_num}"
                        rec = HandshakeRecord(
                            hid=rec_id,
                            file_name=filename,
                            station=station,
                            substation=substation,
                            cycle_id=ctx['current_cycle_id'],
                            attempt_number=attempt_num
                        )
                        rec.pallet_id = current_pal
                        rec.start_time = ts_str
                        rec.end_time = ts_str
                        rec.cycle_start_time = ctx['cycle_start_ts']
                        rec.destination = ctx['dest_val']
                        rec.status = 'PENDING_TRANSFER'

                        # Calculate Pre-Handshake Dwell Duration (State 4/5 -> Req=1)
                        if ctx['cycle_start_ts']:
                            try:
                                t_c0 = datetime.strptime(ctx['cycle_start_ts'], '%Y-%m-%d %H:%M:%S.%f')
                                t_hs0 = datetime.strptime(ts_str, '%Y-%m-%d %H:%M:%S.%f')
                                rec.dwell_duration_ms = max(0, int((t_hs0 - t_c0).total_seconds() * 1000))
                            except Exception:
                                pass

                        if rec.pallet_id == '1111111111':
                            rec.status = 'FAILED'
                            rec.failure_reason = 'BARCODE_READ_FAIL'

                        ctx['attempts'].append(rec)
                        ctx['current_attempt'] = rec

                    elif val_str == '0':
                        # Protocol exchange completed: Point 3 (1 -> 99 -> 0)
                        ctx['handshake_end_ts'] = ts_str
                        if ctx['current_attempt'] and ctx['current_attempt'].status == 'PENDING_TRANSFER':
                            try:
                                t_s = datetime.strptime(ctx['current_attempt'].start_time, '%Y-%m-%d %H:%M:%S.%f')
                                t_e = datetime.strptime(ts_str, '%Y-%m-%d %H:%M:%S.%f')
                                ctx['current_attempt'].protocol_duration_ms = max(0, int((t_e - t_s).total_seconds() * 1000))
                            except Exception:
                                pass

            elif m_msg:
                ts_str, msg = m_msg.groups()
                # 6. Physical Transfer Confirmation (Orchestrator log line)
                if 'Pallet transfer from ' in msg:
                    m_from = re.search(r'Pallet transfer from (\w+)', msg)
                    if m_from:
                        from_st = m_from.group(1)
                        c_ctx = station_cycles[from_st]
                        if c_ctx['current_attempt']:
                            if c_ctx['current_attempt'].status == 'PENDING_TRANSFER':
                                c_ctx['current_attempt'].status = 'SUCCESS'
                                c_ctx['current_attempt'].end_time = ts_str
                                c_ctx['current_attempt'].cycle_end_time = ts_str
                                if c_ctx['cycle_start_ts']:
                                    try:
                                        t_a = datetime.strptime(c_ctx['cycle_start_ts'], '%Y-%m-%d %H:%M:%S.%f')
                                        t_t = datetime.strptime(ts_str, '%Y-%m-%d %H:%M:%S.%f')
                                        c_ctx['current_attempt'].cycle_duration_ms = max(0, int((t_t - t_a).total_seconds() * 1000))
                                    except Exception:
                                        pass
                                if c_ctx['handshake_end_ts']:
                                    try:
                                        t_hs = datetime.strptime(c_ctx['handshake_end_ts'], '%Y-%m-%d %H:%M:%S.%f')
                                        t_t = datetime.strptime(ts_str, '%Y-%m-%d %H:%M:%S.%f')
                                        c_ctx['current_attempt'].discharge_duration_ms = max(0, int((t_t - t_hs).total_seconds() * 1000))
                                    except Exception:
                                        pass
                                c_ctx['current_attempt'].events = list(c_ctx['events'][-35:])
                                records.append(c_ctx['current_attempt'])
                                c_ctx['current_attempt'] = None
                                c_ctx['attempts'] = []
                                c_ctx['current_cycle_id'] = None
                                c_ctx['cycle_pallet'] = None
                                c_ctx['cycle_start_ts'] = None
                                c_ctx['handshake_end_ts'] = None

    # Handle any remaining open attempts at EOF
    for st, c_ctx in station_cycles.items():
        if c_ctx['current_attempt']:
            if c_ctx['current_attempt'].status == 'PENDING_TRANSFER':
                c_ctx['current_attempt'].status = 'FAILED'
                c_ctx['current_attempt'].failure_reason = 'INCOMPLETE (End of Log)'
            c_ctx['current_attempt'].events = list(c_ctx['events'][-35:])
            records.append(c_ctx['current_attempt'])

    return records, station_tag_events

def reload_all_logs():
    global GLOBAL_RECORDS, RECORDS_BY_ID, INDEXED_FILES, STATION_TAG_EVENTS, ALL_DETECTED_STATIONS
    all_recs = []
    combined_station_events = defaultdict(list)
    log_files = glob.glob(os.path.join(LOG_DIR, "*.log"))
    new_indexed_files = {}

    for lf in sorted(log_files):
        fname = os.path.basename(lf)
        stat = os.stat(lf)
        file_recs, file_st_events = parse_log_file(lf)
        all_recs.extend(file_recs)
        for st_k, ev_list in file_st_events.items():
            combined_station_events[st_k].extend(ev_list)
        new_indexed_files[fname] = {
            "name": fname,
            "size_bytes": stat.st_size,
            "modified_time": datetime.fromtimestamp(stat.st_mtime).isoformat(),
            "handshake_count": len(file_recs)
        }

    # Sort newest to oldest
    all_recs.sort(key=lambda r: r.start_time, reverse=True)
    GLOBAL_RECORDS = all_recs
    RECORDS_BY_ID = {r.id: r for r in all_recs}
    INDEXED_FILES = new_indexed_files

    for st_k in combined_station_events:
        combined_station_events[st_k].sort(key=lambda x: x['timestamp'])

    STATION_TAG_EVENTS = combined_station_events
    ALL_DETECTED_STATIONS = sorted(list(combined_station_events.keys()))
    print(f"Loaded {len(GLOBAL_RECORDS)} total handshakes, {len(ALL_DETECTED_STATIONS)} stations from {len(INDEXED_FILES)} files.")

# Initial scan on startup
reload_all_logs()

@app.get("/api/v1/analysis/files")
def get_files():
    return {
        "files": list(INDEXED_FILES.values()),
        "total_files": len(INDEXED_FILES)
    }

@app.post("/api/v1/analysis/rescan")
def rescan():
    reload_all_logs()
    return {"status": "ok", "total_records": len(GLOBAL_RECORDS), "files": len(INDEXED_FILES)}

@app.post("/api/v1/analysis/upload")
async def upload_log_file(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(('.log', '.txt')):
        raise HTTPException(status_code=400, detail="Only .log or .txt files are supported")
    
    safe_filename = os.path.basename(file.filename)
    dest_path = os.path.join(LOG_DIR, safe_filename)
    
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    reload_all_logs()
    uploaded_info = INDEXED_FILES.get(safe_filename, {})
    return {
        "status": "success",
        "message": f"File {safe_filename} uploaded and parsed successfully",
        "file": uploaded_info,
        "total_records": len(GLOBAL_RECORDS),
        "total_files": len(INDEXED_FILES)
    }

@app.get("/api/v1/analysis/summary")
def get_summary(
    file: Optional[str] = None,
    station: Optional[str] = None,
    pallet_id: Optional[str] = None,
    from_time: Optional[str] = None,
    to_time: Optional[str] = None
):
    filtered = filter_records(file, station, pallet_id, from_time, to_time, None, None)
    total = len(filtered)
    if total == 0:
        return {
            "total_handshakes": 0,
            "total_success": 0,
            "total_failed": 0,
            "total_retries": 0,
            "success_rate_pct": 0,
            "avg_dwell_duration_ms": 0,
            "avg_protocol_duration_ms": 0,
            "avg_discharge_duration_ms": 0,
            "avg_cycle_duration_ms": 0,
            "failure_reasons_breakdown": {},
            "busiest_stations": [],
            "slowest_stations": [],
            "min_timestamp": None,
            "max_timestamp": None
        }

    successes = [r for r in filtered if r.status == "SUCCESS"]
    failed = [r for r in filtered if r.status == "FAILED"]

    dwell_durations = [r.dwell_duration_ms for r in successes if r.dwell_duration_ms is not None]
    proto_durations = [r.protocol_duration_ms for r in successes if r.protocol_duration_ms is not None]
    discharge_durations = [r.discharge_duration_ms for r in successes if r.discharge_duration_ms is not None]
    cycle_durations = [r.cycle_duration_ms for r in successes if r.cycle_duration_ms is not None]

    avg_dwell = int(sum(dwell_durations) / len(dwell_durations)) if dwell_durations else 0
    avg_proto = int(sum(proto_durations) / len(proto_durations)) if proto_durations else 0
    avg_discharge = int(sum(discharge_durations) / len(discharge_durations)) if discharge_durations else 0
    avg_cycle = int(sum(cycle_durations) / len(cycle_durations)) if cycle_durations else 0

    fail_reasons: Dict[str, int] = defaultdict(int)
    for r in failed:
        reason = r.failure_reason or "UNKNOWN"
        if "MID_CYCLE" in reason:
            fail_reasons["MID_CYCLE_FAULT"] += 1
        elif "RETRY_ABORTED" in reason:
            fail_reasons["RETRY_ABORTED"] += 1
        elif "PLC_FAULT" in reason:
            fail_reasons["PLC_FAULT"] += 1
        elif "TIMEOUT" in reason or "INCOMPLETE" in reason:
            fail_reasons["TIMEOUT"] += 1
        elif "BARCODE" in reason:
            fail_reasons["BARCODE_READ_FAIL"] += 1
        elif "ABORT" in reason:
            fail_reasons["ABORT_SIGNAL"] += 1
        elif "PROFILE" in reason or "REJECT" in reason:
            fail_reasons["PROFILE_REJECT"] += 1
        else:
            fail_reasons[reason] += 1

    total_retries = sum(1 for r in filtered if r.is_retry)

    # Busiest stations
    st_counts: Dict[str, int] = defaultdict(int)
    st_proto_times: Dict[str, List[int]] = defaultdict(list)
    for r in filtered:
        st_counts[r.station] += 1
        if r.protocol_duration_ms is not None:
            st_proto_times[r.station].append(r.protocol_duration_ms)

    busiest = sorted([{"station": k, "count": v} for k, v in st_counts.items()], key=lambda x: x["count"], reverse=True)[:5]
    slowest = []
    for st, times in st_proto_times.items():
        if times:
            slowest.append({"station": st, "avg_ms": int(sum(times) / len(times)), "samples": len(times)})
    slowest.sort(key=lambda x: x["avg_ms"], reverse=True)
    slowest = slowest[:5]

    all_times = [r.start_time for r in filtered if r.start_time]
    min_ts = min(all_times) if all_times else None
    max_ts = max(all_times) if all_times else None

    return {
        "total_handshakes": total,
        "total_success": len(successes),
        "total_failed": len(failed),
        "total_retries": total_retries,
        "success_rate_pct": round((len(successes) / total) * 100, 1),
        "avg_dwell_duration_ms": avg_dwell,
        "avg_protocol_duration_ms": avg_proto,
        "avg_discharge_duration_ms": avg_discharge,
        "avg_cycle_duration_ms": avg_cycle,
        "failure_reasons_breakdown": dict(fail_reasons),
        "busiest_stations": busiest,
        "slowest_stations": slowest,
        "min_timestamp": min_ts,
        "max_timestamp": max_ts
    }

@app.get("/api/v1/analysis/station-metrics")
def get_station_metrics(
    file: Optional[str] = None,
    from_time: Optional[str] = None,
    to_time: Optional[str] = None
):
    filtered = filter_records(file, None, None, from_time, to_time, None, None)
    groups = defaultdict(list)
    for r in filtered:
        groups[r.station].append(r)

    metrics = []
    for st, recs in groups.items():
        total = len(recs)
        succ = [r for r in recs if r.status == "SUCCESS"]
        fail = [r for r in recs if r.status == "FAILED"]
        rate = round((len(succ) / total) * 100, 1)

        protos = sorted([r.protocol_duration_ms for r in succ if r.protocol_duration_ms is not None])
        cycles = sorted([r.cycle_duration_ms for r in succ if r.cycle_duration_ms is not None])

        avg_proto = int(sum(protos) / len(protos)) if protos else 0
        min_proto = protos[0] if protos else 0
        max_proto = protos[-1] if protos else 0
        p95_proto = protos[int(len(protos) * 0.95)] if protos else 0

        avg_cycle = int(sum(cycles) / len(cycles)) if cycles else 0
        min_cycle = cycles[0] if cycles else 0
        max_cycle = cycles[-1] if cycles else 0
        p95_cycle = cycles[int(len(cycles) * 0.95)] if cycles else 0

        fail_types = defaultdict(int)
        for r in fail:
            fail_types[r.failure_reason or 'OTHER'] += 1

        metrics.append({
            "station": st,
            "total_cycles": total,
            "success_count": len(succ),
            "failure_count": len(fail),
            "success_rate_pct": rate,
            "avg_protocol_ms": avg_proto,
            "min_protocol_ms": min_proto,
            "max_protocol_ms": max_proto,
            "p95_protocol_ms": p95_proto,
            "avg_cycle_ms": avg_cycle,
            "min_cycle_ms": min_cycle,
            "max_cycle_ms": max_cycle,
            "p95_cycle_ms": p95_cycle,
            "failure_breakdown": dict(fail_types)
        })

    metrics.sort(key=lambda m: m["total_cycles"], reverse=True)
    return {"stations": metrics}

@app.get("/api/v1/analysis/handshakes")
def get_handshakes(
    file: Optional[str] = None,
    station: Optional[str] = None,
    pallet_id: Optional[str] = None,
    from_time: Optional[str] = None,
    to_time: Optional[str] = None,
    status: Optional[str] = None,
    failure_reason: Optional[str] = None,
    is_retry: Optional[bool] = None,
    cycle_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=500)
):
    filtered = filter_records(file, station, pallet_id, from_time, to_time, status, failure_reason, is_retry, cycle_id)
    total = len(filtered)
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    items = [r.to_dict(include_events=False) for r in filtered[start_idx:end_idx]]

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if total > 0 else 0
    }

@app.get("/api/v1/analysis/handshake/{hid}")
def get_handshake_detail(hid: str):
    rec = RECORDS_BY_ID.get(hid)
    if not rec:
        raise HTTPException(status_code=404, detail="Handshake transaction not found")
    data = rec.to_dict(include_events=True)
    if rec.cycle_id:
        siblings = [
            r.to_dict(include_events=False) 
            for r in GLOBAL_RECORDS 
            if r.cycle_id == rec.cycle_id
        ]
        siblings.sort(key=lambda x: x["attempt_number"])
        data["cycle_attempts"] = siblings
    else:
        data["cycle_attempts"] = [data]
    return data

@app.get("/api/v1/analysis/export/csv")
def export_handshakes_csv(
    file: Optional[str] = None,
    station: Optional[str] = None,
    pallet_id: Optional[str] = None,
    from_time: Optional[str] = None,
    to_time: Optional[str] = None,
    status: Optional[str] = None,
    failure_reason: Optional[str] = None,
    is_retry: Optional[bool] = None,
    cycle_id: Optional[str] = None
):
    filtered = filter_records(file, station, pallet_id, from_time, to_time, status, failure_reason, is_retry, cycle_id)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Handshake_ID",
        "Cycle_ID",
        "Attempt_Number",
        "Is_Retry",
        "File_Name",
        "Station",
        "Substation",
        "Pallet_ID",
        "Status",
        "Failure_Reason",
        "Destination",
        "Cycle_Start_Time",
        "Handshake_Start_Time",
        "Handshake_End_Time",
        "Cycle_End_Time",
        "Dwell_Duration_ms",
        "Protocol_Duration_ms",
        "Discharge_Duration_ms",
        "Total_Cycle_Duration_ms",
        "Event_Count"
    ])
    for r in filtered:
        writer.writerow([
            r.id,
            r.cycle_id,
            r.attempt_number,
            "YES" if r.is_retry else "NO",
            r.file_name,
            r.station,
            r.substation,
            r.pallet_id,
            r.status,
            r.failure_reason or "",
            r.destination or "",
            r.cycle_start_time or "",
            r.start_time or "",
            r.end_time or "",
            r.cycle_end_time or "",
            r.dwell_duration_ms if r.dwell_duration_ms is not None else "",
            r.protocol_duration_ms if r.protocol_duration_ms is not None else "",
            r.discharge_duration_ms if r.discharge_duration_ms is not None else "",
            r.cycle_duration_ms if r.cycle_duration_ms is not None else "",
            len(r.events)
        ])
    csv_data = output.getvalue()
    filename = f"handshake_cycle_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

@app.get("/api/v1/analysis/handshake/{hid}/raw-logs")
def get_handshake_raw_logs(hid: str):
    rec = RECORDS_BY_ID.get(hid)
    if not rec:
        raise HTTPException(status_code=404, detail="Handshake transaction not found")

    lines = [
        f"# Telemetry Slice for Handshake ID: {rec.id}",
        f"# Station: {rec.station} | Pallet: {rec.pallet_id} | Cycle: {rec.cycle_id} | Attempt: #{rec.attempt_number}",
        f"# Cycle Start: {rec.cycle_start_time or 'N/A'} | Handshake Start: {rec.start_time} | End: {rec.end_time} | Cycle End: {rec.cycle_end_time or 'N/A'}",
        f"# Dwell: {rec.dwell_duration_ms}ms | Protocol: {rec.protocol_duration_ms}ms | Discharge: {rec.discharge_duration_ms}ms | Total Cycle: {rec.cycle_duration_ms}ms",
        f"# Status: {rec.status} | Failure Reason: {rec.failure_reason or 'None'}",
        "#" + ("-" * 90),
    ]
    for ev in rec.events:
        ts = ev.get('ts', '')
        direction = 'Write' if ev.get('direction') == 'WRITE' else 'Read'
        tag = ev.get('tag', '')
        val = ev.get('val', '')
        lines.append(f"[{ts}] Tag {direction} {tag} : {val}")

    content = "\n".join(lines)
    filename = f"{rec.id}_telemetry.log"
    return Response(
        content=content,
        media_type="text/plain",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

def filter_records(
    file: Optional[str],
    station: Optional[str],
    pallet_id: Optional[str],
    from_time: Optional[str],
    to_time: Optional[str],
    status: Optional[str],
    failure_reason: Optional[str],
    is_retry: Optional[bool] = None,
    cycle_id: Optional[str] = None
) -> List[HandshakeRecord]:
    res = GLOBAL_RECORDS

    if file and file.lower() != 'all':
        res = [r for r in res if r.file_name.lower() == file.lower()]

    if station and station.strip():
        q_st = station.strip().lower()
        res = [r for r in res if q_st in r.station.lower()]

    if pallet_id and pallet_id.strip():
        q_pal = pallet_id.strip().lower()
        res = [r for r in res if q_pal in r.pallet_id.lower()]

    if cycle_id and cycle_id.strip():
        q_cid = cycle_id.strip().lower()
        res = [r for r in res if q_cid in r.cycle_id.lower()]

    if is_retry is not None:
        res = [r for r in res if r.is_retry == is_retry]

    if from_time and from_time.strip():
        norm_from = from_time.strip().replace('T', ' ')
        res = [r for r in res if r.start_time >= norm_from]

    if to_time and to_time.strip():
        norm_to = to_time.strip().replace('T', ' ')
        if len(norm_to) == 16:  # YYYY-MM-DD HH:MM
            norm_to = norm_to + ':59.999'
        res = [r for r in res if r.start_time <= norm_to]

    if status and status.upper() in ["SUCCESS", "FAILED"]:
        res = [r for r in res if r.status == status.upper()]

    if failure_reason and failure_reason.strip() and failure_reason.upper() != 'ALL':
        q_fr = failure_reason.strip().lower()
        res = [r for r in res if r.failure_reason and q_fr in r.failure_reason.lower()]

    return res

# =========================================================================
# STATION TAG INSPECTOR & DELTA CALCULATOR ENDPOINTS
# =========================================================================

@app.get("/api/v1/analysis/stations")
def get_detected_stations():
    result = []
    for st in ALL_DETECTED_STATIONS:
        evts = STATION_TAG_EVENTS.get(st, [])
        min_ts = evts[0]['timestamp'] if evts else ""
        max_ts = evts[-1]['timestamp'] if evts else ""
        unique_tags = len(set(e['tag_name'] for e in evts))
        result.append({
            "station": st,
            "total_events": len(evts),
            "unique_tags": unique_tags,
            "min_timestamp": min_ts,
            "max_timestamp": max_ts
        })
    return {
        "stations": result,
        "total_stations": len(result)
    }

@app.get("/api/v1/analysis/station-logs")
def get_station_logs(
    station: Optional[str] = Query(None),
    from_time: Optional[str] = Query(None),
    to_time: Optional[str] = Query(None),
    tag_filter: Optional[str] = Query(None),
    direction: Optional[str] = Query(None),
    file: Optional[str] = Query(None),
    limit: int = Query(500, le=5000),
    offset: int = Query(0)
):
    evts_pool = []
    if station and station.strip() and station.upper() != 'ALL':
        evts_pool = STATION_TAG_EVENTS.get(station.strip(), [])
    else:
        for st in ALL_DETECTED_STATIONS:
            evts_pool.extend(STATION_TAG_EVENTS[st])
        evts_pool.sort(key=lambda x: x['timestamp'])

    res = evts_pool
    if from_time and from_time.strip():
        norm_from = from_time.strip().replace('T', ' ')
        res = [e for e in res if e['timestamp'] >= norm_from]

    if to_time and to_time.strip():
        norm_to = to_time.strip().replace('T', ' ')
        if len(norm_to) == 16:  # YYYY-MM-DD HH:MM
            norm_to = norm_to + ':59.999'
        res = [e for e in res if e['timestamp'] <= norm_to]

    if tag_filter and tag_filter.strip():
        q_tag = tag_filter.strip().lower()
        res = [e for e in res if q_tag in e['tag_name'].lower() or q_tag in e['full_tag'].lower()]

    if direction and direction.upper() in ['READ', 'WRITE']:
        res = [e for e in res if e['direction'] == direction.upper()]

    if file and file.strip() and file.lower() != 'all':
        res = [e for e in res if e['file'] == file.strip()]

    total_matched = len(res)
    paginated = res[offset:offset + limit]

    return {
        "total": total_matched,
        "offset": offset,
        "limit": limit,
        "station": station,
        "events": paginated
    }

@app.get("/api/v1/analysis/station-logs/export")
def export_station_logs(
    station: Optional[str] = Query(None),
    from_time: Optional[str] = Query(None),
    to_time: Optional[str] = Query(None),
    tag_filter: Optional[str] = Query(None),
    direction: Optional[str] = Query(None),
    file: Optional[str] = Query(None)
):
    data = get_station_logs(
        station=station,
        from_time=from_time,
        to_time=to_time,
        tag_filter=tag_filter,
        direction=direction,
        file=file,
        limit=50000,
        offset=0
    )
    events = data.get("events", [])
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Timestamp", "Station", "Substation", "Tag Name", "Full Tag", "Direction", "Value", "File"])
    for e in events:
        writer.writerow([
            e.get('id', ''),
            e.get('timestamp', ''),
            e.get('station', ''),
            e.get('substation', ''),
            e.get('tag_name', ''),
            e.get('full_tag', ''),
            e.get('direction', ''),
            e.get('value', ''),
            e.get('file', '')
        ])

    csv_data = output.getvalue()
    st_name = (station or "ALL").replace(" ", "_")
    filename = f"station_logs_{st_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

if __name__ == '__main__':
    port = int(os.environ.get("ANALYSIS_PORT", "8095"))
    print(f"Starting PLC-mWCS Handshake Analysis Server on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
