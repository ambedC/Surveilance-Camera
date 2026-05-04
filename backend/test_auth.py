#!/usr/bin/env python3
"""
Test script for the authentication system.
Run this after starting the backend server to test all auth endpoints.
"""

import requests
import time
import json

BASE_URL = "http://localhost:8000/api/auth"

def print_section(title):
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60 + "\n")


import random

def test_register():
    """Test user registration with password"""
    print_section("Test: Register New User")
    # pick a random valid Indian phone number starting 6-9
    number = str(random.randint(6000000000, 9999999999))
    payload = {
        "name": "John Doe",
        "email": f"john{number}@example.com",
        "phone_number": number,
        "password": "secret123",
        "confirm_password": "secret123"
    }
    
    response = requests.post(f"{BASE_URL}/register", json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    return response.status_code == 200, payload

def test_login(phone_number, password):
    """Test login with phone and password"""
    print_section("Test: Login Attempt")
    
    payload = {"phone_number": phone_number, "password": password}
    
    response = requests.post(f"{BASE_URL}/login", json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200

def test_get_pending_users():
    """Test getting pending users"""
    print_section("Test 5: Get Pending Users (Admin)")
    
    response = requests.get(f"{BASE_URL}/admin/pending-users")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

def test_get_all_users():
    """Test getting all users"""
    print_section("Test 6: Get All Users (Admin)")
    
    response = requests.get(f"{BASE_URL}/admin/all-users")
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Response: {json.dumps(data, indent=2)}")
    # optionally show summary counts by status
    if data and isinstance(data.get('users'), list):
        by_status = {}
        for u in data['users']:
            by_status[u.get('status','unknown')] = by_status.get(u.get('status','unknown'),0) + 1
        print(f"User counts by status: {by_status}")

def test_approve_user(phone_number):
    """Test approving a user"""
    print_section("Test 7: Approve User (Admin)")
    
    payload = {"phone_number": phone_number}
    
    response = requests.post(f"{BASE_URL}/admin/approve-user", json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    return response.status_code == 200

def test_reject_user(phone_number):
    """Test rejecting a user"""
    print_section("Test 7b: Reject User (Admin)")
    payload = {"phone_number": phone_number}
    response = requests.post(f"{BASE_URL}/admin/reject-user", json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200


def main():
    print("\n" + "█"*60)
    print("  AUTHENTICATION SYSTEM TEST SUITE")
    print("█"*60)
    
    try:
        # Registration flow
        success, register_data = test_register()
        if not success:
            print("❌ Registration failed")
            return

        # Admin functions
        test_get_pending_users()
        test_get_all_users()

        # Approve user
        test_approve_user(register_data["phone_number"])

        # Get updated lists
        test_get_pending_users()
        test_get_all_users()

        # Login attempt using credentials
        test_login(register_data["phone_number"], register_data.get("password", ""))

        # Now simulate another registration to test rejection
        success2, reg2 = test_register()
        if success2:
            test_get_pending_users()
            test_reject_user(reg2["phone_number"])
            test_get_pending_users()
            test_get_all_users()
        else:
            print("❌ Second registration failed, skipping reject test.")

        print("\n" + "="*60)
        print("  ✅ TEST SUITE COMPLETED")
        print("="*60)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nMake sure the backend server is running on http://localhost:8000")

if __name__ == "__main__":
    main()
