#!/usr/bin/env python3
import urllib.request, json, sys

BASE = "http://localhost:4000"

def req(url, method="GET", body=None, token=None):
    data = json.dumps(body).encode() if body else None
    hdrs = {"Content-Type": "application/json"}
    if token:
        hdrs["Authorization"] = f"Bearer {token}"
    r = urllib.request.Request(url, data=data, headers=hdrs, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            return json.loads(resp.read()), resp.status
    except urllib.request.HTTPError as e:
        return json.loads(e.read()), e.code

def login(email, pw):
    d, _ = req(f"{BASE}/api/auth/login", "POST", {"email": email, "password": pw})
    return d["token"]

def check(label, data, status, expect=None):
    ok = status == expect if expect else True
    s = f"[{status}]" if status else ""
    print(f"{'✓' if ok else '✗'} {label} {s}")
    if isinstance(data, dict):
        d = {k: (v[:80] + "..." if isinstance(v, str) and len(v) > 80 else v) for k, v in data.items()}
        print(f"  {json.dumps(d, indent=2)}")
    else:
        print(f"  {data}")
    return ok

hr_t = login("hr@yanol.com", "hr123")
emp_t = login("employee@yanol.com", "employee123")

print("=" * 60)
print("HR ATTENDANCE — FULL FLOW TEST")
print("=" * 60)

# 1. Create attendance record
rec = {
    "employeeId": "emp-001-demis-bekele",
    "employeeName": "Demis Bekele",
    "department": "Administration",
    "date": "2026-09-22",
    "status": "Present",
    "checkIn": "08:15", "checkOut": "17:30",
    "late": 15, "earlyDeparture": 0, "regular": 8, "overtime": 0,
}
created, sc = req(f"{BASE}/api/hr-manager/attendance", "POST", rec, hr_t)
check("1. POST create Present record", created, sc, 201)
rid = created.get("id") if sc == 201 else None

if rid:
    # 2. Update status to Late via PUT
    updated, sc2 = req(f"{BASE}/api/hr-manager/attendance/{rid}", "PUT",
                       {**rec, "status": "Late", "late": 45}, hr_t)
    check("2. PUT status→Late", updated, sc2, 200)

    # 3. PATCH hrStatus → Pending Review
    hr_r, sc3 = req(f"{BASE}/api/hr-manager/attendance/{rid}/hr-status", "PATCH",
                    {"hrStatus": "Pending Review", "hrNote": "Arrived 15min late"}, hr_t)
    rd = hr_r.get("record", {})
    check("3. PATCH hrStatus→Pending Review", rd, sc3, 200)

    # 4. PATCH hrStatus → Approved
    hr_r2, sc4 = req(f"{BASE}/api/hr-manager/attendance/{rid}/hr-status", "PATCH",
                     {"hrStatus": "Approved", "hrNote": "Late but within grace"}, hr_t)
    rd2 = hr_r2.get("record", {})
    check("4. PATCH hrStatus→Approved", rd2, sc4, 200)

    # 5. PATCH hrStatus → Absent (overrides punch)
    hr_r3, sc5 = req(f"{BASE}/api/hr-manager/attendance/{rid}/hr-status", "PATCH",
                     {"hrStatus": "Absent"}, hr_t)
    rd3 = hr_r3.get("record", {})
    check("5. PATCH hrStatus→Absent", rd3, sc5, 200)

    # 6. Employee portal sees HR status
    punch, sc6 = req(f"{BASE}/api/employer/punch", "GET", emp_t)
    check("6. Employee GET /punch sees hrStatus", punch, sc6, 200)

    # 7. DELETE
    deleted, sc7 = req(f"{BASE}/api/hr-manager/attendance/{rid}", "DELETE", hr_t)
    check("7. DELETE record", deleted, sc7, 200)

print()
print("=" * 60)
print("DONE")
print("=" * 60)
