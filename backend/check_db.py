import asyncio
import os
import sys

# Append backend directory to Python path for absolute imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import select
from src.core.database import AsyncSessionLocal
from src.models.models import Ticket, TicketItem, MedicalAttention, Patient, User

async def check():
    async with AsyncSessionLocal() as session:
        print("Checking Tickets...")
        res = await session.execute(select(Ticket).order_by(Ticket.id.desc()).limit(5))
        tickets = res.scalars().all()
        if not tickets:
            print("No tickets found in the database.")
            return

        for t in tickets:
            print(f"Ticket ID: {t.id}, Number: {t.ticket_number}, Amount: {t.total_amount}, Org ID: {t.org_id}, Attention ID: {t.attention_id}")
            
            # Check Items
            ires = await session.execute(select(TicketItem).where(TicketItem.ticket_id == t.id))
            items = ires.scalars().all()
            total_calc = 0
            for i in items:
                print(f"  - Item: {i.description}, Price: {i.unit_price}, Qty: {i.quantity}, Subtotal: {i.subtotal}")
                total_calc += i.subtotal
            
            print(f"  - Calculated Total: {total_calc} | Saved Total: {t.total_amount}")
            if total_calc != t.total_amount:
                print("  - WARNING: Totals do not match!")

            # Check Attention and Patient
            ares = await session.execute(
                select(MedicalAttention, Patient)
                .join(Patient, MedicalAttention.patient_id == Patient.id)
                .where(MedicalAttention.id == t.attention_id)
            )
            att_row = ares.first()
            if att_row:
                att, pat = att_row
                print(f"  - MedicalAttention ID: {att.id}, Status: {att.status}, Patient ID: {pat.id}, Patient Name: {pat.name}")
            else:
                print("  - MedicalAttention NOT FOUND")
        print("\nChecks completed.")

if __name__ == "__main__":
    asyncio.run(check())
