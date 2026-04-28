from __future__ import annotations

from .sign_model import TOKENS


LIFEPRINT_REFERENCE_URL = "https://www.lifeprint.com/asl101/"

# Lifeprint is used here as a curriculum/reference source for choosing practical ASL glosses
# and English aliases. It is not used as raw model-training media.
TOKEN_DATASET_ALIASES: dict[str, tuple[str, ...]] = {
    "HELLO": ("hello", "hi"),
    "THANK_YOU": ("thanks", "thank you", "thank-you"),
    "HELP": ("help",),
    "WATER": ("water",),
    "YES": ("yes",),
    "NO": ("no",),
    "BATHROOM": ("bathroom", "restroom", "toilet"),
    "DOCTOR": ("doctor", "physician"),
    "PAIN": ("pain", "hurt", "ache"),
    "STOP": ("stop",),
    "WAIT": ("wait",),
    "WRITE": ("write",),
    "CALL": ("call", "phone", "telephone"),
    "WHERE": ("where",),
    "NOW": ("now",),
    "PLEASE": ("please",),
    "FOOD": ("food",),
    "EAT": ("eat",),
    "MORE": ("more",),
    "AGAIN": ("again", "repeat"),
    "SORRY": ("sorry",),
    "GOOD": ("good",),
    "BAD": ("bad",),
    "NAME": ("name",),
    "WHAT": ("what",),
    "WHO": ("who",),
    "WHY": ("why",),
    "HOW": ("how",),
    "WHEN": ("when",),
    "HOME": ("home",),
    "SCHOOL": ("school",),
    "WORK": ("work", "job"),
    "FAMILY": ("family",),
    "MOTHER": ("mother", "mom"),
    "FATHER": ("father", "dad"),
    "FRIEND": ("friend",),
    "TEACHER": ("teacher",),
    "STUDENT": ("student",),
    "LEARN": ("learn",),
    "UNDERSTAND": ("understand",),
    "SICK": ("sick", "ill"),
    "MEDICINE": ("medicine", "medication"),
    "HOSPITAL": ("hospital",),
    "GO": ("go",),
    "COME": ("come",),
    "WANT": ("want",),
    "NEED": ("need",),
    "LIKE": ("like",),
    "HAPPY": ("happy",),
    "SAD": ("sad",),
}

DATASET_LABEL_TO_TOKEN = {
    alias: token
    for token, aliases in TOKEN_DATASET_ALIASES.items()
    if token in TOKENS
    for alias in aliases
}


def get_dataset_label_to_token() -> dict[str, str]:
    return DATASET_LABEL_TO_TOKEN.copy()
