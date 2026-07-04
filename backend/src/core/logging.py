"""
Logging estructurado para Veterinaria SaaS.

Módulo centralizado que configura el logger raíz de toda la aplicación.
Todos los módulos del proyecto deben obtener su logger mediante:

    import logging
    logger = logging.getLogger(__name__)

Esto garantiza que el nombre del módulo aparezca correctamente en cada registro.

Formato de salida:
    2026-07-02 23:10:14 | INFO | src.services.finance | Ticket generado correctamente
"""

import logging
import sys


def setup_logging(level: int = logging.DEBUG) -> None:
    """
    Inicializa el sistema de logging del proyecto.

    Debe llamarse una única vez desde src/main.py al arrancar la aplicación.
    Configura un handler de consola (stdout) con el formato estándar del proyecto.
    No agrega dependencias externas.

    Args:
        level: Nivel mínimo de logging. Por defecto DEBUG para desarrollo.
               En producción pasar logging.INFO.
    """
    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    # Evitar duplicar handlers si setup_logging se llama más de una vez
    if not root_logger.handlers:
        root_logger.addHandler(handler)

    root_logger.setLevel(level)

    # Silenciar loggers ruidosos de librerías de terceros
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
