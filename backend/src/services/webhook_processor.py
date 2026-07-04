import os
import json
import logging
import re
from datetime import datetime, timedelta
from sqlalchemy import select
from src.core.database import AsyncSessionLocal
from src.models.models import Service
from src.services.openai_service import get_chat_completion, transcribe_audio_file, get_vision_completion
from src.services.whatsapp import send_whatsapp_message
from src.services.booking import master_booking_flow, get_vaccination_history
from src.services.audio_logic import extract_audio_bytes, save_temp_audio
from src.services.media_logic import extract_media_base64
from src.services.scheduling import get_formatted_availability
from src.core.redis_client import redis_client
from prompts import get_system_prompt
from argparse import Namespace

logger = logging.getLogger(__name__)

async def process_webhook_background(body: dict, org_data: dict, background_tasks=None):
    """
    Background worker to process WhatsApp messages without blocking the webhook.
    """
    org = Namespace(**org_data)
    
    try:
        logger.debug("Processing background task for org '%s'", org.slug)
        data = body.get("data", body) if body.get("data") else body
        
        message_type = data.get("messageType")
        sender = data.get("pushName", "Usuario")
        
        key = data.get("key", {})
        phone = key.get("remoteJid", "").split("@")[0] if key.get("remoteJid") else ""
        if not phone and data.get("phone"): phone = data.get("phone")
        
        if not phone: return

        user_input = ""
        
        # --- MEDIA HANDLING ---
        if message_type == "audioMessage":
            try:
                audio_msg = data.get("message", {}).get("audioMessage", {})
                audio_bytes = await extract_audio_bytes(data, audio_msg)
                if audio_bytes:
                    temp_path = await save_temp_audio(audio_bytes, f"{phone}_{int(datetime.now().timestamp())}.ogg")
                    try:
                        user_input = await transcribe_audio_file(temp_path, api_key=org.openai_api_key)
                    finally:
                        if os.path.exists(temp_path): os.remove(temp_path)
            except Exception as e:
                logger.exception("Audio processing error for phone '%s': %s", phone, e)

        elif message_type == "imageMessage":
            try:
                image_msg = data.get("message", {}).get("imageMessage", {})
                image_base64 = await extract_media_base64(data, image_msg, "image", api_key=org.evolution_api_key)
                if image_base64:
                    vision_prompt = "Esta es una imagen enviada por un cliente a una veterinaria. Describe qué ves (heridas, síntomas, mascota)."
                    user_input = await get_vision_completion(vision_prompt, image_base64, api_key=org.openai_api_key)
            except Exception as e:
                logger.exception("Image processing error for phone '%s': %s", phone, e)

        elif message_type == "conversation":
            user_input = data.get("message", {}).get("conversation", "")
        elif message_type == "extendedTextMessage":
            user_input = data.get("message", {}).get("extendedTextMessage", {}).get("text", "")

        if not user_input: return

        # --- DATA FETCHING (Parallelized/Cached where possible) ---
        
        # 1. History & Context (Redis)
        history = await redis_client.get_history(phone)
        context = await redis_client.get_context(phone)
        pet_name = context.get("pet_name")
        
        # 2. Vaccination History (DB - Only if pet known)
        vaccine_info = ""
        if pet_name:
            vacs = await get_vaccination_history(phone, pet_name, org.id)
            if vacs:
                vaccine_info = f"\nHISTORIAL DE VACUNAS para {pet_name}:\n" + "\n".join([f"- {v.vaccine_name}: {v.date_administered.strftime('%d/%m/%Y')}" for v in vacs])

        # 3. Services (Redis CACHE Optimized) ⚡
        services_text = await redis_client.get_services_text(org.id)
        if not services_text:
            services_text = "LISTADO DE PRECIOS Y SERVICIOS:\n"
            async with AsyncSessionLocal() as session:
                serv_res = await session.execute(select(Service).where(Service.org_id == org.id))
                services = serv_res.scalars().all()
                if services:
                    for s in services:
                        services_text += f"- {s.name}: ${s.price:.2f} ({s.category})\n"
                else:
                    services_text += "(Consulte precios en recepción)\n"
            # Cache it!
            await redis_client.set_services_text(org.id, services_text)

        # 4. Availability
        availability_text = await get_formatted_availability(org.id)

        # --- SYSTEM PROMPT CONSTRUCTION ---
        arg_now = datetime.utcnow() - timedelta(hours=3)
        dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
        meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
        fecha_es = f"{dias[arg_now.weekday()]}, {arg_now.day} de {meses[arg_now.month-1]} de {arg_now.year}"

        system_base = get_system_prompt().replace("[CLINICA_NOMBRE]", org.name)
        system_msg = (
            f"{system_base}\n\n"
            f"IDENTIDAD ACTUAL: Estás atendiendo para la clínica '{org.name}'.\n"
            f"FECHA ACTUAL: Hoy es {fecha_es}.\n"
            f"HORARIOS DISPONIBLES:\n{availability_text}\n"
            f"{services_text}\n"
            f"{vaccine_info}"
        )

        # --- GREETING SHORTCIRCUIT ---
        greetings = ["hola", "buen día", "buenas tardes", "buenas noches", "inicio", "comenzar", "menu", "menú"]
        is_greeting = user_input.lower().strip() in greetings
        if not history and is_greeting:
            welcome_text = (
                f"¡Hola! 🐾 Bienvenido a {org.name}. Soy tu asistente virtual.\n"
                "¿En qué puedo ayudarte hoy?\n\n"
                "1. 📅 *Agendar Cita*\n"
                "2. 💰 *Precios*\n"
                "3. 🩺 *Plan de Vacunación*\n"
                "4. 💊 *Pedidos*"
            )
            await send_whatsapp_message(phone, welcome_text, api_url=org.evolution_api_url, api_key=org.evolution_api_key, instance_name=org.evolution_instance)
            await redis_client.save_history(phone, [{"role": "user", "content": user_input}, {"role": "assistant", "content": welcome_text}])
            return

        # --- OPENAI CALL ---
        messages = [{"role": "system", "content": system_msg}]
        messages.extend(history)
        messages.append({"role": "user", "content": user_input})

        bot_response = await get_chat_completion(messages, api_key=org.openai_api_key)
        
        # --- RESPONSE HANDLING ---
        final_text = bot_response
        if "[[CONFIRMADO:" in bot_response:
            tag_match = re.search(r"\[\[CONFIRMADO:(.*?)\]\]", bot_response, re.DOTALL)
            if tag_match:
                booking_data = json.loads(tag_match.group(1).strip())
                booking_data.update({"owner_name": sender, "phone": phone})
                
                # If we have background_tasks passed from router (rare in this context, usually we just await)
                # But here we are already IN a background task, so we can just await the flow or run it.
                # Since master_booking_flow might take time (Google Calendar), better to await it here sequentially 
                # or fire and forget if it's very slow. For now, await is fine as we are already detached from webhook response.
                await master_booking_flow(booking_data, org)
                
                final_text = re.sub(r"\[\[CONFIRMADO:.*?\]\]", "", bot_response, flags=re.DOTALL).strip()

        await send_whatsapp_message(phone, final_text, api_url=org.evolution_api_url, api_key=org.evolution_api_key, instance_name=org.evolution_instance)

        # Updated History
        history.append({"role": "user", "content": user_input})
        history.append({"role": "assistant", "content": final_text})
        await redis_client.save_history(phone, history)

    except Exception as e:
        logger.exception("Background Process Error for org '%s': %s", org.slug, e)
