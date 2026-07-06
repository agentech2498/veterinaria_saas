import smtplib
import os
import logging
from email.message import EmailMessage

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

def send_email_sync(to_email: str, subject: str, body: str, is_html: bool = False):
    """
    Función sincrónica para enviar emails.
    Puede ser ejecutada en un BackgroundTask de FastAPI.
    """
    if not SMTP_HOST or not SMTP_USER or not SMTP_PASSWORD:
        logger.warning("No se ha configurado SMTP. El email no se enviará.")
        return

    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = SMTP_USER
    msg['To'] = to_email

    if is_html:
        msg.add_alternative(body, subtype='html')
    else:
        msg.set_content(body)

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
        logger.info(f"Email enviado correctamente a {to_email}")
    except Exception as e:
        logger.error(f"Error al enviar email a {to_email}: {e}")
