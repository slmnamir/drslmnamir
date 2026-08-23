#!/usr/bin/env python3
"""Generate the Helix CAT AMC-style question bank (stdlib only)."""
from __future__ import annotations

import hashlib
import json
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

MALES = [
    "James Chen",
    "Michael Nguyen",
    "David Patel",
    "Thomas Williams",
    "Daniel Kim",
    "Jack Thompson",
    "Liam O'Connor",
    "Noah Singh",
    "Ethan Baker",
    "Oliver Rahman",
    "William Zhao",
    "Lucas Martin",
    "Henry Walsh",
    "Mason Clarke",
    "Alexander Papadopoulos",
    "Benjamin Lee",
    "Samuel Ibrahim",
    "Harrison Scott",
    "Cooper Taylor",
    "Archie Wilson",
]
FEMALES = [
    "Sarah Chen",
    "Emma Nguyen",
    "Priya Patel",
    "Olivia Williams",
    "Chloe Kim",
    "Grace Thompson",
    "Mia O'Connor",
    "Isabella Singh",
    "Ava Baker",
    "Zoe Rahman",
    "Sophie Zhao",
    "Emily Martin",
    "Charlotte Walsh",
    "Amelia Clarke",
    "Hannah Papadopoulos",
    "Lily Lee",
    "Ruby Ibrahim",
    "Ella Scott",
    "Matilda Taylor",
    "Ivy Wilson",
]

DOMAINS = {
    "Medicine",
    "Surgery",
    "Emergency",
    "Paediatrics",
    "Obstetrics & Gynaecology",
    "Psychiatry",
    "General Practice",
    "Public Health",
    "Ethics & Professionalism",
}

OUT_PATH = Path("/workspace/src/lib/exam/bank.json")
QUESTIONS: list[dict] = []


def _seed(qid: str) -> int:
    return int(hashlib.sha256(qid.encode("utf-8")).hexdigest()[:16], 16)


def pick_name(qid: str, sex: str) -> str:
    pool = MALES if sex == "M" else FEMALES
    return pool[_seed(qid) % len(pool)]


def irt_from_difficulty(qid: str, difficulty: str, n_options: int) -> tuple[float, float, float]:
    h = _seed(qid)
    if difficulty == "easy":
        b = -1.2 + ((h % 81) / 100.0)
    elif difficulty == "moderate":
        b = -0.3 + ((h % 101) / 100.0)
    elif difficulty == "difficult":
        b = 0.8 + ((h % 101) / 100.0)
    else:
        raise ValueError(difficulty)
    a = 0.70 + ((h // 97) % 111) / 100.0
    a = min(1.8, max(0.7, a))
    c = 0.2 if n_options == 5 else 0.25
    return round(a, 3), round(b, 3), c


def make_q(
    *,
    id: str,
    question: str,
    present: str,
    options: list[str],
    correct: str,
    why_correct: str,
    wrong: list[tuple[str, str]] | dict[str, str],
    reasoning: str,
    domain: str,
    subdomain: str,
    difficulty: str,
    lo: str,
    pearl: str,
    trap: str,
    rf: str = "",
    exam: str = "",
    ix: str = "",
    guideline: str | None = None,
    sex: str | None = None,
    age: int | None = None,
    age_label: str | None = None,
    setting: str = "the emergency department",
    noun: str | None = None,
    extra: str = "",
    vignette: str | None = None,
    discrimination: float | None = None,
    estimated_difficulty: float | None = None,
) -> dict:
    """Assemble a stable, polished question object from clinical parts."""
    if domain not in DOMAINS:
        raise ValueError(f"{id}: bad domain {domain}")
    if difficulty not in {"easy", "moderate", "difficult"}:
        raise ValueError(f"{id}: bad difficulty {difficulty}")
    if correct not in options:
        raise ValueError(f"{id}: correctAnswer not in options")
    if len(options) not in (4, 5):
        raise ValueError(f"{id}: need 4 or 5 options, got {len(options)}")
    if len(set(options)) != len(options):
        raise ValueError(f"{id}: duplicate options")

    h = _seed(id)
    if sex is None:
        sex = "M" if (h % 2 == 0) else "F"
    name = pick_name(id, sex)

    if age is None:
        if domain == "Paediatrics":
            age = 1 + (h % 15)
        elif domain == "Obstetrics & Gynaecology":
            age = 22 + (h % 22)
        else:
            age = 28 + (h % 50)

    infant = bool(age_label and any(k in age_label for k in ("month", "day", "week", "hour")))
    if noun is None:
        if infant or (domain == "Paediatrics" and (age_label or age < 18)):
            noun = "boy" if sex == "M" else "girl"
        else:
            noun = "man" if sex == "M" else "woman"

    if age_label is None:
        age_label = f"{age}-year-old"

    if vignette is None:
        lead = f"{name} is a {age_label} {noun}"
        if rf:
            lead += f" with {rf}"
        lead += f" who presents to {setting} with {present}."
        body = " ".join(x.strip() for x in (exam, ix, extra) if x and str(x).strip())
        vignette = lead + ((" " + body) if body else "")
        vignette = " ".join(vignette.split())

    if isinstance(wrong, dict):
        why_others = dict(wrong)
    else:
        why_others = {k: v for k, v in wrong}

    for opt in options:
        if opt != correct and opt not in why_others:
            raise ValueError(f"{id}: missing why-wrong for {opt!r}")
    why_others.pop(correct, None)
    extra_keys = set(why_others) - set(options)
    if extra_keys:
        raise ValueError(f"{id}: why-wrong keys not in options: {extra_keys}")

    a, b, c = irt_from_difficulty(id, difficulty, len(options))
    if discrimination is not None:
        a = float(discrimination)
        if not (0.7 <= a <= 1.8):
            raise ValueError(f"{id}: discrimination {a} out of range")
    if estimated_difficulty is not None:
        b = float(estimated_difficulty)

    if difficulty == "easy" and not (-1.2 <= b <= -0.4):
        raise ValueError(f"{id}: easy b={b} out of range")
    if difficulty == "moderate" and not (-0.3 <= b <= 0.7):
        raise ValueError(f"{id}: moderate b={b} out of range")
    if difficulty == "difficult" and not (0.8 <= b <= 1.8):
        raise ValueError(f"{id}: difficult b={b} out of range")

    guessing = 0.2 if len(options) == 5 else 0.25
    if c != guessing:
        c = guessing

    return {
        "id": id,
        "question": question,
        "clinicalVignette": vignette,
        "options": list(options),
        "correctAnswer": correct,
        "explanation": {
            "whyCorrect": why_correct,
            "whyOthersWrong": why_others,
        },
        "clinicalReasoning": reasoning,
        "domain": domain,
        "subdomain": subdomain,
        "difficulty": difficulty,
        "discrimination": a,
        "estimatedDifficulty": b,
        "guessing": c,
        "learningObjective": lo,
        "guidelineReference": guideline,
        "keyPearl": pearl,
        "commonTrap": trap,
    }


def add(**kwargs) -> None:
    QUESTIONS.append(make_q(**kwargs))


def add_compact(it: dict) -> None:
    opts = it["opt"]
    ans = it["ans"]
    wrongs = [o for o in opts if o != ans]
    whys = it["w"]
    if len(wrongs) != len(whys):
        raise ValueError(f"{it['id']}: {len(wrongs)} distractors vs {len(whys)} explanations")
    add(
        id=it["id"],
        question=it["q"],
        domain=it["d"],
        subdomain=it["s"],
        difficulty=it["diff"],
        sex=it.get("sex"),
        age=it.get("age"),
        age_label=it.get("age_label"),
        setting=it.get("set", "the emergency department"),
        rf=it.get("rf", ""),
        present=it["p"],
        exam=it.get("ex", ""),
        ix=it.get("ix", ""),
        extra=it.get("extra", ""),
        options=opts,
        correct=ans,
        wrong=list(zip(wrongs, whys)),
        why_correct=it["why"],
        reasoning=it.get("rs", it["why"]),
        pearl=it["pearl"],
        trap=it["trap"],
        lo=it["lo"],
        guideline=it.get("g"),
        noun=it.get("noun"),
        vignette=it.get("v"),
    )


# ---------------------------------------------------------------------------
# Question definitions
# ---------------------------------------------------------------------------

def load_all() -> None:
    load_medicine()
    load_surgery()
    load_emergency()
    load_paediatrics()
    load_og()
    load_psychiatry()
    load_gp()
    load_public_health()
    load_ethics()


def load_medicine() -> None:
    load_medicine_cardiology()
    load_medicine_respiratory()
    load_medicine_gastro()
    load_medicine_hepatology()
    load_medicine_neurology()
    load_medicine_nephrology()
    load_medicine_endocrinology()
    load_medicine_rheumatology()
    load_medicine_id()
    load_medicine_haematology()
    load_medicine_oncology()
    load_medicine_dermatology()


# === MEDICINE: Cardiology ===
def load_medicine_cardiology() -> None:
    add(
        id="med-card-anterior-stemi-pci",
        question="What is the most appropriate immediate reperfusion strategy?",
        sex="M",
        age=58,
        rf="type 2 diabetes and a 40-pack-year smoking history",
        setting="the emergency department of a metropolitan PCI-capable hospital",
        present="1 hour of severe central crushing chest pain radiating to the left arm, with diaphoresis and nausea",
        exam="He is diaphoretic and distressed. Heart rate 92 bpm, blood pressure 148/88 mmHg, oxygen saturations 96% on air. Heart sounds are dual without murmur. The chest is clear.",
        ix="12-lead ECG shows 3 mm ST elevation in V2–V4 with reciprocal depression in II, III and aVF. High-sensitivity troponin is pending.",
        options=[
            "Immediate primary percutaneous coronary intervention",
            "Thrombolysis with tenecteplase then routine transfer",
            "Aspirin loading and serial troponins on the ward",
            "Urgent CT pulmonary angiogram",
            "Exercise stress testing after pain settles",
        ],
        correct="Immediate primary percutaneous coronary intervention",
        why_correct="Anterior STEMI within 12 hours at a PCI-capable centre is managed with immediate primary PCI, which is superior to fibrinolysis when it can be delivered in a timely fashion.",
        wrong=[
            ("Thrombolysis with tenecteplase then routine transfer", "Fibrinolysis is reserved for when timely PCI is not available (typically first-medical-contact-to-device >90–120 minutes)."),
            ("Aspirin loading and serial troponins on the ward", "This is appropriate for possible NSTE-ACS, not for diagnostic ST elevation."),
            ("Urgent CT pulmonary angiogram", "The ECG is diagnostic of STEMI; PE work-up would delay reperfusion."),
            ("Exercise stress testing after pain settles", "Stress testing is contraindicated in acute STEMI."),
        ],
        reasoning="Diagnostic ST elevation in a coronary territory with ongoing ischaemic pain requires immediate reperfusion, preferably primary PCI.",
        domain="Medicine",
        subdomain="Cardiology",
        difficulty="easy",
        lo="Recognise STEMI and select timely primary PCI.",
        guideline="NHFA/CSANZ ACS guidelines",
        pearl="Door-to-device time targets drive the choice between primary PCI and fibrinolysis.",
        trap="Waiting for troponin in a diagnostic STEMI delays life-saving reperfusion.",
    )
    add(
        id="med-card-nstemi-invasive-strategy",
        question="What is the most appropriate next step in management?",
        sex="F",
        age=67,
        rf="hypertension, chronic kidney disease (eGFR 48 mL/min/1.73 m²) and diet-controlled type 2 diabetes",
        setting="the emergency department",
        present="several hours of central chest pressure at rest, now eased with glyceryl trinitrate",
        exam="Heart rate 88 bpm, blood pressure 162/94 mmHg, oxygen saturations 97% on air. Soft S4. No murmur or pulmonary oedema. GRACE score is high.",
        ix="ECG shows 1 mm ST depression in V4–V6. High-sensitivity troponin I is 420 ng/L (URL 16 ng/L). Haemoglobin 128 g/L.",
        options=[
            "Dual antiplatelet therapy, anticoagulation and an early invasive coronary strategy",
            "Immediate thrombolysis with tenecteplase",
            "Discharge after a negative D-dimer",
            "Urgent pericardiocentesis",
            "High-dose prednisolone for presumed myocarditis",
        ],
        correct="Dual antiplatelet therapy, anticoagulation and an early invasive coronary strategy",
        why_correct="Troponin-positive NSTE-ACS with high GRACE score warrants DAPT, anticoagulation and an early invasive strategy rather than a purely conservative approach.",
        wrong=[
            ("Immediate thrombolysis with tenecteplase", "Fibrinolysis is not indicated in NSTE-ACS and increases bleeding."),
            ("Discharge after a negative D-dimer", "D-dimer does not exclude ACS; this patient has a diagnostic troponin rise."),
            ("Urgent pericardiocentesis", "There are no features of tamponade."),
            ("High-dose prednisolone for presumed myocarditis", "Ischaemic ECG change plus risk factors make ACS far more likely; steroids are not first-line."),
        ],
        reasoning="NSTEMI is defined by ischaemic symptoms, ECG change and troponin rise without persistent ST elevation; high-risk patients go early to angiography.",
        domain="Medicine",
        subdomain="Cardiology",
        difficulty="moderate",
        lo="Risk-stratify NSTE-ACS and choose an early invasive pathway.",
        guideline="NHFA/CSANZ ACS guidelines",
        pearl="GRACE and ongoing ischaemia, not troponin magnitude alone, drive timing of angiography.",
        trap="Giving fibrinolysis for ST depression (a common and harmful error).",
    )
    add(
        id="med-card-unstable-af-dcv",
        question="What is the most appropriate immediate management?",
        sex="M",
        age=74,
        rf="hypertension and previous TIA",
        setting="the emergency department",
        present="sudden palpitations and near-syncope for 40 minutes",
        exam="He is cool and clammy. Heart rate 168 bpm and irregular, blood pressure 72/44 mmHg, oxygen saturations 91% on air. There is pulmonary oedema to the midzones.",
        ix="ECG shows irregularly irregular broad-complex tachycardia without discernible P waves, consistent with atrial fibrillation with a rapid ventricular response and rate-related aberrancy. Troponin is pending.",
        options=[
            "Immediate synchronised DC cardioversion",
            "IV amiodarone infusion over 1 hour then reassess",
            "IV metoprolol 5 mg and observe",
            "Oral digoxin loading on the ward",
            "Adenosine 6 mg rapid IV bolus",
        ],
        correct="Immediate synchronised DC cardioversion",
        why_correct="Haemodynamic instability (shock, pulmonary oedema, syncope) due to tachyarrhythmia is an indication for immediate synchronised cardioversion, not stepwise drug therapy.",
        wrong=[
            ("IV amiodarone infusion over 1 hour then reassess", "Pharmacological cardioversion is too slow in shock."),
            ("IV metoprolol 5 mg and observe", "Beta blockade may worsen hypotension."),
            ("Oral digoxin loading on the ward", "Digoxin is slow and inotropic-neutral; it is not for unstable AF."),
            ("Adenosine 6 mg rapid IV bolus", "Adenosine is for diagnosis/treatment of regular SVT, not AF, and will not restore sinus rhythm."),
        ],
        reasoning="Unstable tachyarrhythmia is treated with electricity first; drugs are for the stable patient.",
        domain="Medicine",
        subdomain="Cardiology",
        difficulty="easy",
        lo="Identify unstable AF and perform immediate synchronised cardioversion.",
        guideline="Australian Resuscitation Council / Therapeutic Guidelines",
        pearl="Shock + tachyarrhythmia = synchronised DC cardioversion, then anticoagulation decisions.",
        trap="Trying to 'rate-control first' in a crashing patient.",
    )
    add(
        id="med-card-af-anticoag-chadsvasc",
        question="What is the most appropriate long-term stroke-prevention strategy?",
        sex="F",
        age=78,
        rf="hypertension, type 2 diabetes and a prior ischaemic stroke",
        setting="the cardiology outpatient clinic",
        present="an incidental finding of atrial fibrillation on a preoperative ECG. She is asymptomatic",
        exam="Heart rate 76 bpm and irregular, blood pressure 138/82 mmHg. No heart failure signs. CHA2DS2-VASc score is 7. HAS-BLED is 2.",
        ix="ECG confirms AF. Echocardiogram shows mild left atrial dilatation, LVEF 58%, no valvular stenosis. eGFR 62 mL/min/1.73 m². Haemoglobin 132 g/L.",
        options=[
            "Start a direct oral anticoagulant",
            "Aspirin 100 mg daily indefinitely",
            "No antithrombotic therapy because she is asymptomatic",
            "Warfarin with target INR 3.5–4.5",
            "Left atrial appendage occlusion as first-line therapy",
        ],
        correct="Start a direct oral anticoagulant",
        why_correct="Non-valvular AF with CHA2DS2-VASc of 7 confers very high stroke risk; a DOAC is first-line antithrombotic therapy when bleeding risk is acceptable.",
        wrong=[
            ("Aspirin 100 mg daily indefinitely", "Aspirin is inferior for stroke prevention in AF and is not recommended as monotherapy."),
            ("No antithrombotic therapy because she is asymptomatic", "Stroke risk is driven by CHA2DS2-VASc, not symptoms."),
            ("Warfarin with target INR 3.5–4.5", "If warfarin is used, target INR is 2.0–3.0; this INR range is for mechanical mitral valves, not AF."),
            ("Left atrial appendage occlusion as first-line therapy", "Occlusion is considered when anticoagulation is contraindicated, not as default first-line."),
        ],
        reasoning="Anticoagulate high-risk non-valvular AF with a DOAC unless there is a strong contraindication.",
        domain="Medicine",
        subdomain="Cardiology",
        difficulty="moderate",
        lo="Apply CHA2DS2-VASc and choose DOAC therapy in non-valvular AF.",
        guideline="NHFA/CSANZ AF guidelines",
        pearl="Symptoms guide rate/rhythm strategy; scores guide anticoagulation.",
        trap="Using aspirin instead of anticoagulation for 'mild' AF.",
    )
    add(
        id="med-card-hfref-gdmt",
        question="Which additional disease-modifying therapy is most appropriate to commence now?",
        sex="M",
        age=64,
        rf="previous anterior myocardial infarction 8 months ago",
        setting="the heart-failure clinic",
        present="NYHA class II dyspnoea despite current therapy",
        exam="Heart rate 72 bpm in sinus rhythm, blood pressure 118/74 mmHg. Mild ankle oedema. JVP not elevated. Chest clear.",
        ix="Echocardiogram LVEF 32%. He takes ramipril 10 mg daily, bisoprolol 10 mg daily, spironolactone 25 mg daily and frusemide 40 mg daily. eGFR 64 mL/min/1.73 m². Serum potassium 4.4 mmol/L.",
        options=[
            "Add an SGLT2 inhibitor (e.g. dapagliflozin)",
            "Stop the ACE inhibitor and start verapamil",
            "Add digoxin as mandatory fourth-line therapy",
            "Add a non-dihydropyridine calcium-channel blocker",
            "Cease spironolactone because LVEF is above 30%",
        ],
        correct="Add an SGLT2 inhibitor (e.g. dapagliflozin)",
        why_correct="Foundational HFrEF therapy is an ACEI/ARNI, evidence-based beta blocker, mineralocorticoid receptor antagonist and SGLT2 inhibitor. He is missing the SGLT2 inhibitor.",
        wrong=[
            ("Stop the ACE inhibitor and start verapamil", "Verapamil is negatively inotropic and not disease-modifying in HFrEF."),
            ("Add digoxin as mandatory fourth-line therapy", "Digoxin may be considered for residual symptoms or rate control in AF, not as foundational GDMT."),
            ("Add a non-dihydropyridine calcium-channel blocker", "Diltiazem/verapamil worsen systolic heart failure."),
            ("Cease spironolactone because LVEF is above 30%", "MRAs remain indicated at LVEF ≤40% with NYHA II–IV symptoms."),
        ],
        reasoning="Four foundational pillars reduce mortality in HFrEF; add the missing SGLT2 inhibitor.",
        domain="Medicine",
        subdomain="Cardiology",
        difficulty="moderate",
        lo="List foundational pharmacotherapy for HFrEF.",
        guideline="NHFA/CSANZ heart failure guidelines",
        pearl="SGLT2 inhibitors help HFrEF with or without diabetes.",
        trap="Adding a calcium-channel blocker for 'blood pressure and rate control' in HFrEF.",
    )
    add(
        id="med-card-apo-gtn-cpap",
        question="What is the most appropriate initial management besides oxygen and a loop diuretic?",
        sex="F",
        age=81,
        rf="HFpEF, hypertension and chronic kidney disease",
        setting="the emergency department",
        present="acute severe dyspnoea after missing her diuretic for 3 days and eating takeaway food",
        exam="She sits upright, using accessory muscles. Heart rate 110 bpm, blood pressure 198/110 mmHg, respiratory rate 32/min, oxygen saturations 86% on air. Widespread crackles and a loud S3.",
        ix="ECG sinus tachycardia. Chest radiograph shows pulmonary oedema. Arterial blood gas on 15 L reservoir mask: pH 7.28, PaCO2 52 mmHg, PaO2 61 mmHg, HCO3 24 mmol/L. Troponin mildly elevated.",
        options=[
            "Glyceryl trinitrate infusion and non-invasive ventilation",
            "Immediate endotracheal intubation before any medical therapy",
            "IV metoprolol to lower the blood pressure",
            "IV fluids for presumed sepsis",
            "Discharge on oral frusemide doubling",
        ],
        correct="Glyceryl trinitrate infusion and non-invasive ventilation",
        why_correct="Hypertensive acute pulmonary oedema is treated with nitrates to reduce preload/afterload and NIV (CPAP/BiPAP) to improve oxygenation and work of breathing, plus a loop diuretic.",
        wrong=[
            ("Immediate endotracheal intubation before any medical therapy", "A trial of NIV is appropriate unless there is coma, vomiting or imminent arrest."),
            ("IV metoprolol to lower the blood pressure", "Beta blockade in acute pulmonary oedema can precipitate cardiogenic shock."),
            ("IV fluids for presumed sepsis", "This is fluid-overloaded pulmonary oedema; fluids would worsen it."),
            ("Discharge on oral frusemide doubling", "Type 2 respiratory failure and hypoxia require emergency treatment."),
        ],
        reasoning="Unload the left ventricle with nitrates and support ventilation with NIV in hypertensive APO.",
        domain="Medicine",
        subdomain="Cardiology",
        difficulty="moderate",
        lo="Manage acute cardiogenic pulmonary oedema with nitrates and NIV.",
        guideline="NHFA/CSANZ heart failure guidelines",
        pearl="High BP + pink frothy sputum + crackles = nitrates and CPAP, not beta blockers.",
        trap="Intubating every APO before a trial of CPAP, or giving fluids for 'hypotension' that is actually cardiogenic shock.",
    )
    add(
        id="med-card-severe-aortic-stenosis",
        question="What is the most likely diagnosis?",
        sex="M",
        age=79,
        rf="no known cardiac history",
        setting="the general medical clinic",
        present="exertional syncope and progressive dyspnoea over 4 months",
        exam="Blood pressure 108/92 mmHg. Slow-rising carotid pulse. A harsh 4/6 ejection systolic murmur radiating to both carotids, with a soft S2. The apex is not displaced.",
        ix="ECG shows left ventricular hypertrophy with strain. Chest radiograph is not enlarged. Troponin is normal.",
        options=[
            "Severe aortic stenosis",
            "Hypertrophic obstructive cardiomyopathy",
            "Mitral regurgitation due to leaflet prolapse",
            "Atrial septal defect",
            "Aortic regurgitation",
        ],
        correct="Severe aortic stenosis",
        why_correct="The classic triad of syncope, dyspnoea and (often) angina plus a slow-rising pulse, narrow pulse pressure, harsh ESM to the carotids and soft S2 indicates severe calcific aortic stenosis in the elderly.",
        wrong=[
            ("Hypertrophic obstructive cardiomyopathy", "HOCM typically presents younger; the murmur increases with Valsalva and there is often a bisferiens or brisk pulse."),
            ("Mitral regurgitation due to leaflet prolapse", "MR is a pansystolic murmur at the apex radiating to the axilla, with a displaced apex if severe."),
            ("Atrial septal defect", "ASD has a pulmonary flow murmur and fixed splitting of S2, not syncope with a slow-rising pulse."),
            ("Aortic regurgitation", "AR is a diastolic murmur with a wide pulse pressure, the opposite of this pulse pressure."),
        ],
        reasoning="Elderly syncope + slow-rising pulse + harsh ESM to carotids = severe AS until proven otherwise.",
        domain="Medicine",
        subdomain="Cardiology",
        difficulty="easy",
        lo="Recognise the bedside features of severe aortic stenosis.",
        guideline="ESC valvular heart disease guidelines",
        pearl="A soft S2 and narrow pulse pressure suggest the stenosis is severe.",
        trap="Attributing exertional syncope in the elderly to 'vasovagal' without listening to the heart.",
    )
    add(
        id="med-card-hocm-avoid-vasodilators",
        question="Which medication should be avoided?",
        sex="M",
        age=26,
        rf="a family history of sudden death in his father at age 34",
        setting="the cardiology clinic after an abnormal pre-sport medical",
        present="mild exertional chest tightness and one unexplained faint after sprinting",
        exam="Jerky pulse. Double apical impulse. A 3/6 ejection systolic murmur at the left sternal edge that intensifies during Valsalva.",
        ix="ECG shows deep inferolateral T-wave inversion and LVH. Echocardiogram: septal thickness 22 mm, SAM of the mitral valve, resting LVOT gradient 48 mmHg.",
        options=[
            "Dihydropyridine calcium-channel blockers such as nifedipine",
            "Beta blockers such as metoprolol",
            "Disopyramide in specialist hands",
            "Avoidance of competitive sprint sports pending specialist review",
            "Family screening of first-degree relatives",
        ],
        correct="Dihydropyridine calcium-channel blockers such as nifedipine",
        why_correct="Vasodilators and pure afterload reducers increase the dynamic LVOT gradient in HOCM and can precipitate syncope or shock. Beta blockers (and sometimes disopyramide) are preferred.",
        wrong=[
            ("Beta blockers such as metoprolol", "Beta blockers are first-line to reduce gradient and symptoms."),
            ("Disopyramide in specialist hands", "Disopyramide is a recognised agent for residual obstruction."),
            ("Avoidance of competitive sprint sports pending specialist review", "High-intensity competitive sport is restricted until risk-stratified."),
            ("Family screening of first-degree relatives", "HOCM is often autosomal dominant; cascade screening is essential."),
        ],
        reasoning="Do not vasodilate an obstructive LVOT; reduce contractility and avoid hypovolaemia.",
        domain="Medicine",
        subdomain="Cardiology",
        difficulty="difficult",
        lo="Identify HOCM and avoid vasodilators and inotropes.",
        guideline="ESC cardiomyopathy guidelines",
        pearl="Valsalva louder = HOCM or mitral prolapse; squatting softer = HOCM.",
        trap="Treating HOCM chest pain as ACS with nitrates, which worsen obstruction.",
    )
    add(
        id="med-card-pericarditis-nsaid-colchicine",
        question="What is the most appropriate first-line treatment?",
        sex="M",
        age=29,
        rf="a viral illness 1 week ago",
        setting="the emergency department",
        present="sharp central chest pain worse lying flat and on inspiration, eased sitting forward",
        exam="Heart rate 96 bpm, temperature 37.6°C, blood pressure 118/76 mmHg with no paradox. A three-component pericardial rub is heard. JVP is not elevated.",
        ix="ECG shows widespread concave ST elevation and PR depression. Troponin is minimally elevated. Echocardiogram shows a trivial effusion and normal LV function. CRP 64 mg/L.",
        options=[
            "Ibuprofen plus colchicine",
            "Urgent primary PCI",
            "High-dose prednisolone as first-line therapy",
            "Therapeutic heparin infusion",
            "Immediate pericardiocentesis",
        ],
        correct="Ibuprofen plus colchicine",
        why_correct="Acute pericarditis is treated with an NSAID plus colchicine to reduce symptoms and recurrence. Steroids are reserved for contraindications to NSAIDs or autoimmune disease.",
        wrong=[
            ("Urgent primary PCI", "Widespread concave ST elevation with PR depression and a rub is pericarditis, not territorial STEMI."),
            ("High-dose prednisolone as first-line therapy", "Steroids increase recurrence risk if used first-line without indication."),
            ("Therapeutic heparin infusion", "Anticoagulation is not indicated and may worsen a haemorrhagic effusion."),
            ("Immediate pericardiocentesis", "There is no tamponade and only a trivial effusion."),
        ],
        reasoning="Positional pain, rub, widespread ST elevation and PR depression define pericarditis; NSAID plus colchicine is first-line.",
        domain="Medicine",
        subdomain="Cardiology",
        difficulty="moderate",
        lo="Distinguish pericarditis from STEMI and treat with NSAID plus colchicine.",
        guideline="ESC pericardial disease guidelines",
        pearl="PR depression is the most specific ECG clue for pericarditis.",
        trap="Activating the cath lab for widespread concave ST elevation without looking for PR depression or a rub.",
    )
    add(
        id="med-card-endocarditis-cultures-first",
        question="What is the most appropriate next step?",
        sex="M",
        age=46,
        rf="a bicuspid aortic valve and poor dentition",
        setting="the emergency department",
        present="2 weeks of fever, night sweats and new dyspnoea",
        exam="Temperature 38.7°C, heart rate 108 bpm, blood pressure 132/48 mmHg. A new early diastolic murmur is heard at the left sternal edge. Splinter haemorrhages are present.",
        ix="Haemoglobin 102 g/L, WCC 14.8 × 10^9/L, CRP 186 mg/L, creatinine 110 µmol/L. Urinalysis shows microscopic haematuria. Chest radiograph is clear.",
        options=[
            "Obtain three sets of blood cultures then start empirical IV antibiotics",
            "Start oral amoxicillin immediately then culture later if he fails to improve",
            "Reassure and review in 1 week if fever persists",
            "Commence high-dose NSAIDs for presumed rheumatic fever",
            "Urgent exercise stress test",
        ],
        correct="Obtain three sets of blood cultures then start empirical IV antibiotics",
        why_correct="Suspected native-valve endocarditis requires multiple blood culture sets before antibiotics, then prompt empirical IV therapy covering streptococci, staphylococci and enterococci, plus echocardiography.",
        wrong=[
            ("Start oral amoxicillin immediately then culture later if he fails to improve", "Oral antibiotics before cultures frequently render cultures negative and are inadequate for endocarditis."),
            ("Reassure and review in 1 week if fever persists", "New regurgitant murmur plus fever is endocarditis until proven otherwise."),
            ("Commence high-dose NSAIDs for presumed rheumatic fever", "Acute rheumatic fever is uncommon at this age in urban Australia; this is infective endocarditis."),
            ("Urgent exercise stress test", "Stress testing is contraindicated in suspected acute valve destruction."),
        ],
        reasoning="Fever + new regurgitant murmur = cultures then IV antibiotics and echo, not oral antibiotics first.",
        domain="Medicine",
        subdomain="Cardiology",
        difficulty="moderate",
        lo="Apply Duke-oriented work-up: cultures before antibiotics, then echo.",
        guideline="Therapeutic Guidelines: Antibiotic",
        pearl="Wide pulse pressure and an early diastolic murmur suggest acute aortic regurgitation from endocarditis.",
        trap="Giving a single oral antibiotic in ED and sending the patient home with 'viral illness'.",
    )
    add(
        id="med-card-aortic-dissection-ct",
        question="What is the most appropriate next investigation?",
        sex="M",
        age=61,
        rf="longstanding poorly controlled hypertension",
        setting="the emergency department",
        present="sudden tearing interscapular pain at maximal intensity from onset, with sweating",
        exam="Blood pressure 188/102 mmHg in the right arm and 146/90 mmHg in the left arm. Heart rate 98 bpm. A new early diastolic murmur is heard. Distal pulses are asymmetrical.",
        ix="ECG shows non-specific ST depression. Chest radiograph shows a widened mediastinum. Troponin is borderline. D-dimer is elevated.",
        options=[
            "Urgent CT aortogram",
            "Exercise stress ECG",
            "Outpatient Holter monitor",
            "Reassurance and NSAIDs for musculoskeletal pain",
            "Delayed MRI in 48 hours after blood pressure settles",
        ],
        correct="Urgent CT aortogram",
        why_correct="Sudden tearing pain, pulse/BP differential, new AR and a wide mediastinum are classic for acute aortic syndrome; CT aortogram is the usual first-line definitive imaging in a stable patient.",
        wrong=[
            ("Exercise stress ECG", "Stress testing is contraindicated and delays diagnosis."),
            ("Outpatient Holter monitor", "This is not an arrhythmia presentation."),
            ("Reassurance and NSAIDs for musculoskeletal pain", "Maximal-at-onset tearing pain is never 'muscular' until dissection is excluded."),
            ("Delayed MRI in 48 hours after blood pressure settles", "Diagnosis cannot wait 48 hours; mortality is time-dependent."),
        ],
        reasoning="Think dissection when pain is instantaneous and maximal, especially with pulse deficit or new AR.",
        domain="Medicine",
        subdomain="Cardiology",
        difficulty="moderate",
        lo="Recognise acute aortic syndrome and request CT aortogram.",
        guideline="ESC aortic disease guidelines",
        pearl="A BP differential >20 mmHg plus sudden back pain is dissection until proven otherwise.",
        trap="Treating this as ACS with thrombolysis or dual antiplatelet therapy.",
    )
    add(
        id="med-card-complete-heart-block-pacing",
        question="What is the most appropriate management?",
        sex="F",
        age=82,
        rf="ischaemic heart disease",
        setting="the emergency department",
        present="recurrent syncope over 24 hours and profound fatigue",
        exam="Heart rate 34 bpm, blood pressure 96/58 mmHg, oxygen saturations 95% on air. Cannon A waves are visible. Heart sounds are dual with varying intensity.",
        ix="ECG shows complete (third-degree) atrioventricular block with a wide complex escape rhythm at 34 bpm. Troponin is mildly elevated. Electrolytes are normal, potassium 4.1 mmol/L.",
        options=[
            "Temporary pacing followed by a permanent pacemaker",
            "IV flecainide",
            "Oral sotalol loading",
            "Reassurance that this is vasovagal syncope",
            "IV adenosine to terminate the rhythm",
        ],
        correct="Temporary pacing followed by a permanent pacemaker",
        why_correct="Symptomatic complete heart block with a slow wide-complex escape requires urgent pacing; a permanent pacemaker is definitive unless a fully reversible cause is identified.",
        wrong=[
            ("IV flecainide", "Class Ic agents are contraindicated in conduction block and ischaemic heart disease."),
            ("Oral sotalol loading", "Sotalol further slows conduction and prolongs QT."),
            ("Reassurance that this is vasovagal syncope", "Cannon A waves and a 34 bpm escape are not vasovagal."),
            ("IV adenosine to terminate the rhythm", "Adenosine is for SVT diagnosis/treatment and would suppress the escape rhythm."),
        ],
        reasoning="Unstable or symptomatic high-grade AV block is a pacing problem, not a drug problem.",
        domain="Medicine",
        subdomain="Cardiology",
        difficulty="easy",
        lo="Recognise complete heart block and arrange pacing.",
        guideline="ESC pacing guidelines",
        pearl="Cannon A waves + variable S1 intensity = AV dissociation.",
        trap="Giving atropine repeatedly and delaying pacing in wide-complex complete heart block.",
    )
    add(
        id="med-card-mitral-stenosis-rheumatic",
        question="What is the most likely diagnosis?",
        sex="F",
        age=38,
        rf="a childhood illness of migratory arthritis while living in a remote community, and she identifies as Aboriginal",
        setting="the medical assessment unit",
        present="progressive dyspnoea, orthopnoea and palpitations in the third trimester of pregnancy",
        exam="Irregular pulse at 118 bpm. Loud S1, an opening snap and a low-pitched mid-diastolic rumble at the apex. Mild ankle oedema. No fever.",
        ix="ECG shows atrial fibrillation with right ventricular strain. Chest radiograph shows left atrial enlargement and pulmonary venous hypertension.",
        options=[
            "Rheumatic mitral stenosis with atrial fibrillation",
            "Mitral valve prolapse with severe regurgitation",
            "Aortic stenosis of bicuspid valve",
            "Peripartum cardiomyopathy as the only diagnosis",
            "Constrictive pericarditis",
        ],
        correct="Rheumatic mitral stenosis with atrial fibrillation",
        why_correct="A mid-diastolic rumble, opening snap and loud S1 in a First Nations woman with a childhood rheumatic history, now presenting in pregnancy with AF, is rheumatic mitral stenosis.",
        wrong=[
            ("Mitral valve prolapse with severe regurgitation", "MVP/MR is a systolic murmur, not a diastolic rumble."),
            ("Aortic stenosis of bicuspid valve", "AS is an ejection systolic murmur and uncommon as isolated rheumatic disease in this pattern."),
            ("Peripartum cardiomyopathy as the only diagnosis", "PPCM causes a dilated hypokinetic LV without an opening snap and diastolic rumble."),
            ("Constrictive pericarditis", "Constriction has a pericardial knock and prominent y descent, not a mitral rumble."),
        ],
        reasoning="Rheumatic MS often declares itself in pregnancy when circulating volume rises; AF is a common decompensating rhythm.",
        domain="Medicine",
        subdomain="Cardiology",
        difficulty="moderate",
        lo="Recognise rheumatic mitral stenosis in pregnancy, especially in Aboriginal and Torres Strait Islander patients.",
        guideline="NHFA/CSANZ / RHDAustralia guidelines",
        pearl="Loud S1 + opening snap + diastolic rumble = mitral stenosis.",
        trap="Labelling all pregnancy dyspnoea as physiological without listening at the apex in left lateral position.",
    )
    add(
        id="med-card-wpw-af-avoid-av-blockers",
        question="Which treatment should be avoided?",
        sex="M",
        age=22,
        rf="no regular medications",
        setting="the emergency department",
        present="sudden palpitations and light-headedness for 20 minutes after playing sport",
        exam="He is conscious and conversing. Heart rate 210 bpm, blood pressure 108/70 mmHg. Chest is clear.",
        ix="ECG shows an irregularly irregular very rapid wide-complex tachycardia with varying QRS morphology, some pre-excited beats, consistent with AF in Wolff–Parkinson–White syndrome.",
        options=[
            "IV verapamil",
            "Procainamide (where available) or immediate DC cardioversion if unstable",
            "Synchronised cardioversion if he becomes hypotensive",
            "Expert electrophysiology referral after conversion",
            "Avoidance of further AV-nodal blocking drugs",
        ],
        correct="IV verapamil",
        why_correct="In pre-excited AF, AV-nodal blockers (verapamil, diltiazem, digoxin, adenosine, beta blockers) facilitate conduction over the accessory pathway and can precipitate VF.",
        wrong=[
            ("Procainamide (where available) or immediate DC cardioversion if unstable", "Procainamide or DC cardioversion are appropriate."),
            ("Synchronised cardioversion if he becomes hypotensive", "Unstable pre-excited AF is cardioverted."),
            ("Expert electrophysiology referral after conversion", "Ablation is definitive therapy for WPW with AF."),
            ("Avoidance of further AV-nodal blocking drugs", "This is correct advice, not something to avoid."),
        ],
        reasoning="Never block the AV node in pre-excited AF; shock or use a class I/III agent.",
        domain="Medicine",
        subdomain="Cardiology",
        difficulty="difficult",
        lo="Recognise pre-excited AF and avoid AV-nodal blockers.",
        guideline="NHFA/CSANZ AF guidelines",
        pearl="Irregular, very fast, variable wide QRS = WPW + AF until proven otherwise.",
        trap="Giving verapamil or adenosine because the rhythm 'looks like SVT'.",
    )
    add(
        id="med-card-tamponade-pericardiocentesis",
        question="What is the most appropriate immediate intervention after ABC and IV access?",
        sex="F",
        age=54,
        rf="newly diagnosed lung adenocarcinoma",
        setting="the emergency department",
        present="progressive dyspnoea, dizziness and oliguria over 3 days",
        exam="Heart rate 122 bpm, blood pressure 86/64 mmHg with 16 mmHg of paradox. JVP is markedly elevated with absent y descent. Heart sounds are muffled. Lungs are clear.",
        ix="ECG shows low voltages and electrical alternans. Bedside ultrasound demonstrates a large pericardial effusion with right ventricular diastolic collapse.",
        options=[
            "Urgent pericardiocentesis",
            "Massive IV fluid challenge only, with no drainage planned",
            "IV metoprolol to reduce tachycardia",
            "Positive-pressure NIV as first-line therapy",
            "Discharge with oral dexamethasone",
        ],
        correct="Urgent pericardiocentesis",
        why_correct="Beck's triad, pulsus paradoxus and echocardiographic chamber collapse define tamponade; the treatment is drainage. Fluids are a temporising measure only.",
        wrong=[
            ("Massive IV fluid challenge only, with no drainage planned", "Fluids may buy minutes if hypovolaemic but do not treat the effusion."),
            ("IV metoprolol to reduce tachycardia", "Tachycardia is compensatory; beta blockade can cause arrest."),
            ("Positive-pressure NIV as first-line therapy", "Positive pressure further reduces venous return."),
            ("Discharge with oral dexamethasone", "Malignant effusions may respond to oncology therapy later, not instead of drainage of tamponade."),
        ],
        reasoning="Tamponade is a mechanical problem: drain the pericardium.",
        domain="Medicine",
        subdomain="Cardiology",
        difficulty="moderate",
        lo="Diagnose cardiac tamponade and arrange urgent drainage.",
        guideline="ESC pericardial disease guidelines",
        pearl="Clear lungs + shock + high JVP = tamponade or constriction, not left ventricular failure.",
        trap="Treating the hypotension with NIV and nitrates as if it were APO.",
    )
    add(
        id="med-card-hypertensive-emergency-encephalopathy",
        question="What is the most appropriate blood-pressure strategy?",
        sex="M",
        age=55,
        rf="known hypertension who has run out of perindopril for 10 days",
        setting="the emergency department",
        present="severe headache, confusion and vomiting",
        exam="Blood pressure 232/136 mmHg, heart rate 98 bpm. There is papilloedema and retinal flame haemorrhages. He is drowsy but protecting his airway. No focal motor deficit.",
        ix="CT brain shows no haemorrhage. Creatinine 168 µmol/L (baseline 90). Urinalysis 2+ protein. ECG voltage criteria for LVH. Troponin mildly elevated.",
        options=[
            "Controlled reduction of mean arterial pressure by about 25% in the first hour with a titratable IV agent in a monitored setting",
            "Immediate reduction of systolic pressure to 100 mmHg with sublingual nifedipine",
            "No treatment until an outpatient ABPM is arranged",
            "Thrombolysis for presumed ischaemic stroke",
            "Single dose of oral clonidine then discharge",
        ],
        correct="Controlled reduction of mean arterial pressure by about 25% in the first hour with a titratable IV agent in a monitored setting",
        why_correct="Hypertensive encephalopathy is a true emergency: lower MAP ~25% in the first hour with a titratable IV agent (e.g. GTN, labetalol, nicardipine), then more gradually, to avoid hypoperfusion.",
        wrong=[
            ("Immediate reduction of systolic pressure to 100 mmHg with sublingual nifedipine", "Precipitous drops cause stroke; sublingual nifedipine is dangerous and obsolete."),
            ("No treatment until an outpatient ABPM is arranged", "End-organ damage (encephalopathy, retinopathy, AKI) defines an emergency."),
            ("Thrombolysis for presumed ischaemic stroke", "CT is non-haemorrhagic but this is encephalopathy, not a lacunar syndrome, and BP is far too high for thrombolysis."),
            ("Single dose of oral clonidine then discharge", "He requires monitored IV therapy."),
        ],
        reasoning="Emergency = end-organ damage; lower BP in a controlled fashion, not to 'normal' immediately.",
        domain="Medicine",
        subdomain="Cardiology",
        difficulty="difficult",
        lo="Distinguish hypertensive emergency from urgency and lower BP in a controlled manner.",
        guideline="NHFA hypertension guidelines",
        pearl="Papilloedema plus very high BP is hypertensive emergency even if CT is 'normal'.",
        trap="Nifedipine capsules to 'crash' the BP — a classic AMC trap.",
    )
    add(
        id="med-card-dressler-syndrome",
        question="What is the most likely diagnosis?",
        sex="M",
        age=63,
        rf="an anterior STEMI treated with primary PCI 3 weeks ago",
        setting="the emergency department",
        present="pleuritic chest pain, low-grade fever and malaise for 4 days",
        exam="Temperature 38.1°C, heart rate 92 bpm, blood pressure 128/78 mmHg without paradox. A pericardial rub is present. Mild basal dullness on the left.",
        ix="ECG shows widespread ST elevation compared with his discharge tracing. CRP 92 mg/L, WCC 11.2 × 10^9/L. Troponin is not significantly rising. Chest radiograph shows a small left pleural effusion. Echocardiogram: small effusion, LVEF 44%, no regional deterioration.",
        options=[
            "Dressler syndrome (post-cardiac injury pericarditis)",
            "Acute stent thrombosis",
            "Community-acquired pneumonia as the sole diagnosis",
            "Ventricular free-wall rupture",
            "Dressler-negative early mechanical complication at day 3",
        ],
        correct="Dressler syndrome (post-cardiac injury pericarditis)",
        why_correct="Autoimmune pericarditis/pleuritis 2–6 weeks after MI (or cardiac surgery) with fever, rub, raised CRP and a small effusion is Dressler syndrome.",
        wrong=[
            ("Acute stent thrombosis", "Stent thrombosis presents with recurrent territorial STEMI and a rising troponin, usually earlier and more dramatically."),
            ("Community-acquired pneumonia as the sole diagnosis", "A rub plus widespread ST elevation is pericarditis, though pneumonia can coexist."),
            ("Ventricular free-wall rupture", "Rupture causes tamponade and shock, typically 3–7 days post-MI."),
            ("Dressler-negative early mechanical complication at day 3", "The time course here is weeks, not days."),
        ],
        reasoning="Late post-MI fever and pericarditis = Dressler; early shock = mechanical complication.",
        domain="Medicine",
        subdomain="Cardiology",
        difficulty="moderate",
        lo="Distinguish Dressler syndrome from acute stent thrombosis and mechanical rupture.",
        guideline="ESC pericardial disease guidelines",
        pearl="Timing separates post-MI complications: days = mechanical; weeks = Dressler.",
        trap="Sending every post-MI chest pain straight for repeat PCI without examining for a rub.",
    )
    add(
        id="med-card-svt-adenosine",
        question="What is the most appropriate next pharmacological treatment after vagal manoeuvres fail?",
        sex="F",
        age=31,
        rf="no past history",
        setting="the emergency department",
        present="sudden-onset palpitations while sitting at her desk, with mild chest fluttering but no syncope",
        exam="She is anxious but well perfused. Heart rate 180 bpm and regular, blood pressure 118/76 mmHg, oxygen saturations 99% on air.",
        ix="ECG shows a regular narrow-complex tachycardia at 180 bpm with no visible P waves, consistent with AVNRT. There is no pre-excitation in a previous ECG.",
        options=[
            "Adenosine 6 mg rapid IV bolus via a large proximal vein",
            "IV verapamil as first-line in all patients",
            "IV amiodarone 300 mg over 20 minutes as first-line",
            "Digoxin 500 micrograms oral",
            "Flecainide 300 mg oral without specialist advice in all cases",
        ],
        correct="Adenosine 6 mg rapid IV bolus via a large proximal vein",
        why_correct="Stable regular narrow-complex SVT that fails vagal manoeuvres is treated with adenosine, which is diagnostic and often therapeutic for AVNRT/AVRT.",
        wrong=[
            ("IV verapamil as first-line in all patients", "Verapamil is an alternative if adenosine is contraindicated, not default first-line, and is unsafe if the QRS is wide."),
            ("IV amiodarone 300 mg over 20 minutes as first-line", "Amiodarone is not first-line for stable SVT."),
            ("Digoxin 500 micrograms oral", "Too slow and not indicated."),
            ("Flecainide 300 mg oral without specialist advice in all cases", "Pill-in-the-pocket flecainide is for selected known AF/SVT patients after safety assessment, not undifferentiated ED SVT."),
        ],
        reasoning="Vagal manoeuvres then adenosine for stable regular narrow-complex tachycardia.",
        domain="Medicine",
        subdomain="Cardiology",
        difficulty="easy",
        lo="Treat stable SVT with vagal manoeuvres then adenosine.",
        guideline="Australian Resuscitation Council",
        pearl="Warn the patient they will feel dreadful for 10 seconds; record a rhythm strip during the bolus.",
        trap="Giving adenosine as a slow infusion into a hand vein — it will be metabolised before the heart.",
    )


# MARKER_RESP
# MARKER_GASTRO
# MARKER_HEP
# MARKER_NEURO
# MARKER_NEPH
# MARKER_ENDO
# MARKER_RHEUM
# MARKER_ID
# MARKER_HAEM
# MARKER_ONC
# MARKER_DERM
# MARKER_SURGERY
# MARKER_EMERGENCY
# MARKER_PAEDS
# MARKER_OG
# MARKER_PSYCH
# MARKER_GP
# MARKER_PH
# MARKER_ETHICS


def _load(name: str) -> None:
    from bank_items import GROUPS
    for it in GROUPS[name]:
        add_compact(it)


def load_medicine_respiratory() -> None:
    _load("respiratory")


def load_medicine_gastro() -> None:
    _load("gastro")


def load_medicine_hepatology() -> None:
    _load("hepatology")


def load_medicine_neurology() -> None:
    _load("neurology")


def load_medicine_nephrology() -> None:
    _load("nephrology")


def load_medicine_endocrinology() -> None:
    _load("endocrinology")


def load_medicine_rheumatology() -> None:
    _load("rheumatology")


def load_medicine_id() -> None:
    _load("id")


def load_medicine_haematology() -> None:
    _load("haematology")


def load_medicine_oncology() -> None:
    _load("oncology")


def load_medicine_dermatology() -> None:
    _load("dermatology")


def load_surgery() -> None:
    _load("surgery")


def load_emergency() -> None:
    _load("emergency")


def load_paediatrics() -> None:
    _load("paediatrics")


def load_og() -> None:
    _load("og")


def load_psychiatry() -> None:
    _load("psychiatry")


def load_gp() -> None:
    _load("gp")


def load_public_health() -> None:
    _load("public_health")


def load_ethics() -> None:
    _load("ethics")


def main() -> None:
    load_all()
    n = len(QUESTIONS)
    ids = [q["id"] for q in QUESTIONS]
    vignettes = [q["clinicalVignette"] for q in QUESTIONS]
    assert n >= 520, f"Need >=520 questions, got {n}"
    assert len(ids) == len(set(ids)), "Duplicate ids"
    assert len(vignettes) == len(set(vignettes)), "Duplicate vignettes"
    for q in QUESTIONS:
        assert q["correctAnswer"] in q["options"], q["id"]
        assert q["domain"] in DOMAINS
        assert 4 <= len(q["options"]) <= 5
        assert q["guessing"] == (0.2 if len(q["options"]) == 5 else 0.25)

    diff = Counter(q["difficulty"] for q in QUESTIONS)
    easy_p = diff["easy"] / n
    mod_p = diff["moderate"] / n
    dif_p = diff["difficult"] / n
    assert 0.12 <= easy_p <= 0.28, f"easy {easy_p:.2%}"
    assert 0.40 <= mod_p <= 0.60, f"moderate {mod_p:.2%}"
    assert 0.22 <= dif_p <= 0.38, f"difficult {dif_p:.2%}"

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(QUESTIONS, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    dom = Counter(q["domain"] for q in QUESTIONS)
    print(f"Wrote {n} questions to {OUT_PATH}")
    print("Domain counts:")
    for k in sorted(dom):
        print(f"  {k}: {dom[k]}")
    print("Difficulty counts:")
    for k in ("easy", "moderate", "difficult"):
        print(f"  {k}: {diff[k]} ({diff[k]/n:.1%})")
    print(f"File size: {OUT_PATH.stat().st_size} bytes")


if __name__ == "__main__":
    main()
