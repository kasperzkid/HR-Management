#!/usr/bin/env python3
"""Attendance system test suite — tests both Employee punch clock and HR Manager grid."""

import urllib.request
import urllib.error
import json
import sys

BASE = "http://localhost:4000"

def auth(email, password):
    req = urllib.request.Request(f"{BASE}/api/auth/login",
        data=json.dumps({"email": email, "password": password}).encode(),
        headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())["token"]

def get(url, token):
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read()), resp.status
    except urllib.error.HTTPError as e:
        return json.loads(e.read()), e.code

def post(url, token, body):
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read()), resp.status
    except urllib.error.HTTPError as e:
        return json.loads(e.read()), e.code

def put(url, token, body):
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="PUT")
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read()), resp.status
    except urllib.error.HTTPError as e:
        return json.loads(e.read()), e.code

def delete(url, token):
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"}, method="DELETE")
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read()), resp.status
    except urllib.error.HTTPError as e:
        return json.loads(e.read()), e.code

def t(label, result, expect_status=None):
    status = result[1] if isinstance(result, tuple) else None
    data = result[0] if isinstance(result, tuple) else result
    ok = True
    if expect_status and status != expect_status:
        ok = False
    status_str = f"[{status}]" if status else ""
    print(f"{'✓' if ok else '✗'} {label} {status_str}")
    if isinstance(data, dict):
        # Trim long fields for readability
        d = {k: (v[:60] + '...' if isinstance(v, str) and len(v) > 60 else v) for k, v in data.items()}
        print(f"  {json.dumps(d, indent=4)}")
    else:
        print(f"  {data}")
    return ok

# ── Authenticate ──────────────────────────────────────────────
print("=" * 60)
print("AUTHENTICATION")
print("=" * 60)
emp_token = auth("employee@yanol.com", "employee123")
hr_token = auth("hr@yanol.com", "hr123")
print(f"Employee token: {emp_token[:40]}...")
print(f"HR token:       {hr_token[:40]}...")
print()

emp_headers = {"Authorization": f"Bearer {emp_token}"}
hr_headers = {"Authorization": f"Bearer {hr_token}"}

# ── EMPLOYEE PUNCH CLOCK TESTS ────────────────────────────────
print("=" * 60)
print("EMPLOYEE PUNCH CLOCK")
print("=" * 60)

# Test 1: Get today's punch status (should be empty)
t("GET /punch — today's status (initial)", get(f"{BASE}/api/employer/punch", emp_token), 200)

# Test 2: Check-in with valid coords near office (9.0245, 38.7485)
t("POST /punch/check-in — with office coords",
  post(f"{BASE}/api/employer/punch/check-in", emp_token, {"latitude": 9.0245, "longitude": 38.7485}),
  201)

# Test 3: Check punch status again (should show checked in)
t("GET /punch — after check-in", get(f"{BASE}/api/employer/punch", emp_token), 200)

# Test 4: Duplicate check-in should fail
t("POST /punch/check-in — duplicate (should 409)",
  post(f"{BASE}/api/employer/punch/check-in", emp_token, {"latitude": 9.0245, "longitude": 38.7485}),
  409)

# Test 5: Check-out too early (before 17:30) — should fail
t("POST /punch/check-out — too early (should 400)",
  post(f"{BASE}/api/employer/punch/check-out", emp_token, {"latitude": 9.0245, "longitude": 38.7485}),
  400)

# Test 6: Emergency check-out without remark (should fail - needs 5+ chars)
t("POST /punch/check-out — emergency, no remark (should 400)",
  post(f"{BASE}/api/employer/punch/check-out", emp_token, {"latitude": 9.0245, "longitude": 38.7485, "emergency": True}),
  400)

# Test 7: Emergency check-out with valid remark
t("POST /punch/check-out — emergency with remark",
  post(f"{BASE}/api/employer/punch/check-out", emp_token,
       {"latitude": 9.0245, "longitude": 38.7485, "emergency": True, "remark": "Family emergency — had to leave"}),
  200)

# Test 8: Punch status after emergency check-out
t("GET /punch — after emergency departure", get(f"{BASE}/api/employer/punch", emp_token), 200)

print()

# ── HR MANAGER ATTENDANCE GRID TESTS ──────────────────────────
print("=" * 60)
print("HR MANAGER — ATTENDANCE GRID")
print("=" * 60)

# Test 9: List all employees
t("GET /hr-manager/employees", get(f"{BASE}/api/hr-manager/employees", hr_token), 200)

# Test 10: Get current month attendance
today = "2026-09-22"
t("GET /hr-manager/attendance — current month",
  get(f"{BASE}/api/hr-manager/attendance?startDate=2026-09-01&endDate=2026-09-30", hr_token),
  200)

# Test 11: Create a new attendance record for Demis Bekele
# First get Demis's employee ID
emp_data, _ = get(f"{BASE}/api/hr-manager/employees", hr_token)
demis = next((e for e in emp_data if "Demis" in (e.get("name") or "")), None)
if demis:
    demis_id = demis.get("id") or demis.get("employeeId")
    print(f"  Found Demis Bekele: id={demis_id}")
    
    # Create attendance: Present for today
    new_record = {
        "employeeId": demis_id,
        "employeeName": demis.get("name", "Demis Bekele"),
        "department": demis.get("department", "Administration"),
        "date": today,
        "status": "Present",
        "checkIn": "08:00",
        "checkOut": "17:30",
        "late": 0,
        "earlyDeparture": 0,
        "regular": 8,
        "overtime": 0,
    }
    t("POST /hr-manager/attendance — create Present record",
      post(f"{BASE}/api/hr-manager/attendance", hr_token, new_record),
      201)
    
    # Test 12: Get the created record
    # Find the record ID from the response or list
    att_data, _ = get(f"{BASE}/api/hr-manager/attendance?startDate=2026-09-01&endDate=2026-09-30", hr_token)
    created = next((r for r in att_data if r.get("employeeId") == demis_id and r.get("date") == today), None)
    if created:
        created_id = created.get("id")
        print(f"  Created record id: {created_id}")
        
        # Test 13: Update to Late
        t("PUT /hr-manager/attendance/{id} — change to Late",
          put(f"{BASE}/api/hr-manager/attendance/{created_id}", hr_token,
              {**created, "status": "Late", "late": 30}),
          200)
        
        # Test 14: Update to Absent
        t("PUT /hr-manager/attendance/{id} — change to Absent",
          put(f"{BASE}/api/hr-manager/attendance/{created_id}", hr_token,
              {**created, "status": "Absent", "late": 0}),
          200)
        
        # Test 15: Update hrStatus to Pending Review
        t("PUT /hr-manager/attendance/{id} — set hrStatus=Pending Review",
          put(f"{BASE}/api/hr-manager/attendance/{created_id}", hr_token,
              {**created, "status": "Absent", "hrStatus": "Pending Review", "hrNote": "Please explain"}),
          200)
        
        # Test 16: Delete the test record
        t("DELETE /hr-manager/attendance/{id} — delete test record",
          delete(f"{BASE}/api/hr-manager/attendance/{created_id}", hr_token),
          200)
    else:
        print("  Could not find created record")
else:
    print("  Demis Bekele not found in employees list")

print()

# ── ATTENDANCE SUMMARY ────────────────────────────────────────
print("=" * 60)
print("FINAL ATTENDANCE STATE")
print("=" * 60)
t("GET /punch — final state", get(f"{BASE}/api/employer/punch", emp_token), 200)
t("GET /hr-manager/attendance — final month",
  get(f"{BASE}/api/hr-manager/attendance?startDate=2026-09-01&endDate=2026-09-30", hr_token),
  200)

print()
print("=" * 60)
print("ALL TESTS COMPLETE")
print("=" * 60)
