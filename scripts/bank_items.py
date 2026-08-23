"""Compact AMC-style item catalogs. Imported by generate-question-bank.py."""

from items_emergency import ITEMS as EMERGENCY
from items_ethics_ph import ITEMS as ETHICS_PH
from items_extras import ITEMS as EXTRAS
from items_gp import ITEMS as GP
from items_medicine_a import ITEMS as MEDICINE_A
from items_medicine_b import ITEMS as MEDICINE_B
from items_og import ITEMS as OG
from items_paeds import ITEMS as PAEDS
from items_psych import ITEMS as PSYCH
from items_surgery import ITEMS as SURGERY

GROUPS: dict[str, list[dict]] = {
    "respiratory": [],
    "gastro": [],
    "hepatology": [],
    "neurology": [],
    "nephrology": [],
    "endocrinology": [],
    "rheumatology": [],
    "id": [],
    "haematology": [],
    "oncology": [],
    "dermatology": [],
    "surgery": SURGERY,
    "emergency": EMERGENCY,
    "paediatrics": PAEDS,
    "og": OG,
    "psychiatry": PSYCH,
    "gp": GP,
    "public_health": [],
    "ethics": [],
}

for item in MEDICINE_A + MEDICINE_B + EXTRAS:
    key = item["_g"]
    GROUPS[key].append(item)

for item in ETHICS_PH:
    GROUPS[item["_g"]].append(item)
