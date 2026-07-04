import logging
from reportlab.platypus import Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.units import cm
from typing import List, Dict, Any
from ..base import BaseDocumentBuilder
from ..dtos import ClinicData, VetIdentity, PatientData

logger = logging.getLogger(__name__)

class TicketBuilder(BaseDocumentBuilder):
    def __init__(self, clinic_data: ClinicData, vet_identity: VetIdentity, patient_data: PatientData, ticket_data: Dict[str, Any], items: List[Dict[str, Any]]):
        super().__init__(clinic_data, vet_identity, patient_data)
        self.ticket_data = ticket_data
        self.items = items

    def generate(self) -> bytes:
        logger.debug(
            "Generando PDF ticket: numero='%s' paciente='%s' items=%d total=%.2f",
            self.ticket_data.get('ticket_number'), self.patient_data.name,
            len(self.items), self.ticket_data.get('total_amount', 0)
        )
        try:
            self.elements.append(Paragraph(f"TICKET #{self.ticket_data['ticket_number']}", self.styles['TitleCentered']))
            self.elements.append(Spacer(1, 0.5*cm))
            
            # Text declaration
            self.elements.append(Paragraph(f"<b>Fecha:</b> {self.ticket_data['date']}", self.styles['Normal']))
            self.elements.append(Spacer(1, 0.5*cm))
            
            # Patient Info
            self.elements.append(self.build_patient_info_block())
            self.elements.append(Spacer(1, 1*cm))
            
            # Items Table
            data = [["Descripción", "Cant", "Precio Unit", "Subtotal"]]
            for item in self.items:
                data.append([
                    Paragraph(item['description'], self.styles['Normal']),
                    str(item['quantity']),
                    f"${item['unit_price']:.2f}",
                    f"${item['subtotal']:.2f}"
                ])
            
            # Result Row
            data.append(["", "", "TOTAL", f"${self.ticket_data['total_amount']:.2f}"])
            
            table = Table(data, colWidths=[9*cm, 2*cm, 3*cm, 3*cm])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#475569")),
                ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0,0), (-1,0), 8),
                ('BACKGROUND', (0,1), (-1,-1), colors.HexColor("#f8fafc")),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
                ('FONTNAME', (-2,-1), (-1,-1), 'Helvetica-Bold'), # Total row bold
                ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor("#e2e8f0")), # Total row background
            ]))
            self.elements.append(table)
            
            self.elements.append(Spacer(1, 1.5*cm))
            self.elements.append(Paragraph("<i>Este ticket es un comprobante interno y no reemplaza un comprobante fiscal.</i>", self.styles['Subtitle']))
            
            self.doc.build(
                self.elements, 
                onFirstPage=self._draw_header, 
                onLaterPages=self._draw_header
            )
            return self.buffer.getvalue()
        finally:
            self._cleanup()
