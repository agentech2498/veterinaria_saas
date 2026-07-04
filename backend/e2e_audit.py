import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from sqlalchemy import select, func
from src.main import app
from src.core.database import AsyncSessionLocal
from src.models.models import User, Organization, Appointment, MedicalAttention, Patient, Ticket, TicketItem
from src.core.security import admin_required

# We will use global to store our test data
test_context = {}

async def override_admin_required():
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(User).limit(1))
        user = res.scalar()
        if user:
            return user.username
        return "admin"

app.dependency_overrides[admin_required] = override_admin_required
client = TestClient(app)

async def check_db_integrity(ticket_id, app_id):
    print("\n--- DB Integrity Check ---")
    async with AsyncSessionLocal() as session:
        # Check Appointment
        app_res = await session.execute(select(Appointment).where(Appointment.id == app_id))
        appointment = app_res.scalar()
        print(f"Appointment ID {app_id} Status: {appointment.status}")
        
        # Check Attention
        att_res = await session.execute(select(MedicalAttention).where(MedicalAttention.start_date == appointment.date))
        att = att_res.scalars().all()
        # Find the one that matches our ticket
        
        t_res = await session.execute(select(Ticket).where(Ticket.id == ticket_id))
        ticket = t_res.scalar()
        print(f"Ticket ID {ticket.id} Total: {ticket.total_amount} Attention ID: {ticket.attention_id}")
        
        ti_res = await session.execute(select(TicketItem).where(TicketItem.ticket_id == ticket_id))
        items = ti_res.scalars().all()
        calc_total = sum(i.subtotal for i in items)
        print(f"TicketItems Count: {len(items)}, Calculated Total: {calc_total}")
        if calc_total != ticket.total_amount:
            print("ERROR: Total mismatch!")
        
        return len(items) > 0 and calc_total == ticket.total_amount

def run_e2e_test():
    print("Starting E2E Audit...")
    
    # 1. Create Appointment
    print("\n1. Creating Appointment...")
    res1 = client.post("/admin/add_appointment", json={
        "pet_name": "AuditDog",
        "owner_phone": "123456789",
        "owner_name": "Audit Owner",
        "date": "2026-10-10T10:00:00",
        "reason": "Auditoria de Sistema"
    })
    print(res1.status_code, res1.json())
    
    # 2. Get the appointment ID (we need to query it since add_appointment doesn't return it)
    print("\n2. Fetching Appointments to get ID...")
    res2 = client.get("/admin/")
    admin_data = res2.json()
    appointments = admin_data.get("all_appointments", [])
    test_app = next((a['appointment'] for a in appointments if a['appointment']['pet_name'] == "AuditDog"), None)
    if not test_app:
        print("ERROR: Appointment not found in Dashboard!")
        return
    app_id = test_app['id']
    print(f"Found Appointment ID: {app_id}")
    
    # 3. Finish Attention
    print("\n3. Finishing Attention and generating ticket...")
    res3 = client.post(f"/attentions/finish_appointment/{app_id}", json={
        "items": [
            {"description": "Consulta Auditoria", "price": 15000, "quantity": 1},
            {"description": "Vacuna Antirrabica", "price": 8500, "quantity": 2}
        ],
        "payment_method": "Efectivo",
        "notes": "Auditoria automatizada"
    })
    print(res3.status_code, res3.json())
    ticket_id = res3.json().get("ticket_id")
    
    # 4. Cashier API Metrics
    print("\n4. Checking Finance Metrics...")
    res4 = client.get("/finance/metrics?period=today")
    print(res4.status_code, res4.json())
    
    # 5. Cashier API Tickets
    print("\n5. Checking Finance Tickets...")
    res5 = client.get("/finance/tickets")
    print(res5.status_code, len(res5.json()), "tickets found.")
    
    # 6. PDF Generation
    print("\n6. Checking PDF Generation...")
    res6 = client.get(f"/finance/ticket/{ticket_id}/pdf")
    print(res6.status_code, res6.headers.get("content-type"), f"{len(res6.content)} bytes")
    
    # 7. Verify DB Integrity
    asyncio.run(check_db_integrity(ticket_id, app_id))

if __name__ == "__main__":
    run_e2e_test()
