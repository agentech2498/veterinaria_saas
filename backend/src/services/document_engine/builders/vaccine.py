import logging
from reportlab.platypus import Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.units import cm
from typing import List
from ..base import BaseDocumentBuilder
from ..dtos import VaccineData, ClinicData, VetIdentity, PatientData

logger = logging.getLogger(__name__)

class VaccineBuilder(BaseDocumentBuilder):
    def __init__(self, clinic_data: ClinicData, vet_identity: VetIdentity, patient_data: PatientData, vaccines: List[VaccineData]):
        super().__init__(clinic_data, vet_identity, patient_data)
        self.vaccines = vaccines

    def generate(self) -> bytes:
        logger.debug("Generando PDF vacunas: paciente='%s' vacunas=%d", self.patient_data.name, len(self.vaccines))
        try:
            self.elements.append(Paragraph("CERTIFICADO DE VACUNACIÓN", self.styles['TitleCentered']))
            self.elements.append(Spacer(1, 0.5*cm))
            
            # Text declaration
            decl_text = f"Por la presente certifico que el paciente descrito a continuación ha sido evaluado e inmunizado de acuerdo al plan sanitario vigente."
            self.elements.append(Paragraph(decl_text, self.styles['Normal']))
            self.elements.append(Spacer(1, 0.5*cm))
            
            # Patient Info
            self.elements.append(self.build_patient_info_block())
            self.elements.append(Spacer(1, 1*cm))
            
            self.elements.append(Paragraph("Plan Sanitario Registrado:", self.styles['Subtitle']))
            self.elements.append(Spacer(1, 0.2*cm))
            
            if not self.vaccines:
                self.elements.append(Paragraph("No hay vacunas registradas para este paciente.", self.styles['Normal']))
            else:
                data = [["Fecha", "Vacuna / Tratamiento", "Lote", "Próxima Dosis"]]
                for v in self.vaccines:
                    data.append([
                        Paragraph(v.date, self.styles['Normal']),
                        Paragraph(v.vaccine_name, self.styles['Normal']),
                        Paragraph(v.batch_number or "-", self.styles['Normal']),
                        Paragraph(v.next_dose or "-", self.styles['Normal'])
                    ])
                    
                table = Table(data, colWidths=[2.5*cm, 6.5*cm, 3.5*cm, 3.5*cm], repeatRows=1)
                table.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0d9488")),
                    ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                    ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                    ('ALIGN', (0,0), (-1,0), 'CENTER'),
                    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                    ('INNERGRID', (0,0), (-1,-1), 0.25, colors.HexColor("#cbd5e1")),
                    ('BOX', (0,0), (-1,-1), 0.25, colors.HexColor("#cbd5e1")),
                    ('PADDING', (0,0), (-1,-1), 6),
                ]))
                self.elements.append(table)
                
            self.elements.append(Spacer(1, 2*cm))
            self.elements.append(self.build_signature_block())
            
            self.doc.build(
                self.elements, 
                onFirstPage=self._draw_header, 
                onLaterPages=self._draw_header
            )
            return self.buffer.getvalue()
        finally:
            self._cleanup()
