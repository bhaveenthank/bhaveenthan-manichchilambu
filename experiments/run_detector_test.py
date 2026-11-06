"""
The composer above is handed clean records. The harder question: from the Tamil alone, can a machine
tell which patterns a passage needs? That's what it would face on text nobody has annotated.

Unit: a span of verse lines. Label: what the hand records citing that span require.
Three classical detectors now, with the LLM slot left for when Tier 2 runs:
  always_no : never predicts the facet (the honest floor for rare facets)
  cue_rules : Tamil cue words, written by reading the dev episodes
  char_lr   : logistic regression on character 2-4 grams, trained on other episodes

Scored two ways: leave one episode out, and train on one epic and test on the other.
"""
import json
import re
from pathlib import Path

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score, precision_score, recall_score

from manichchilambu.compose import references, requirements
from manichchilambu.ledger import load
from manichchilambu.text import line_text, nfc

ROOT = Path(__file__).resolve().parent.parent
TEXT = line_text()
records = load("ledger.yaml", "ledger_heldout.yaml", "ledger_ext.yaml")
FACETS = ["voice", "mood", "state", "reason", "birth"]

# Cue stems for each facet. These are guesses from reading, the test says how good they are.
CUES = {
    "voice": r"என[க்ச்வ]?|எனும்|என்று|என்றா|என்றன|உரை|கூறு|கேள்|யான்|நின்|நீ\b|யேன்",
    "mood": r"ஆயின்|ஆகில்|எனின்|கனவ|கனா|கொல்|போலும்|கொள்க|வேண்டு|கெடுக|ஒழிக|மின்\b|உறுமெ|செய்க",
    "state": r"கொடு|தந்|புகு|புக்|கொண்ட|பெற்ற|கொன்|துணி|வீழ்ந்|ஆக்கி|தந்த|விட்ட|ஈந்",
    "reason": r"ஆதலின்|ஆகலின்|ஊழ்வினை|வினை|காரண|ஏவ|ஆதலால்|பயத்",
    "birth": r"பிறப்|பிறவி|முந்தை|பண்டை|உம்மை|முன்னாள்|பழ வினை|பிறந்",
}

spans = {}
ref = references(records)
for r in records:
    key = (r["lines"][0], len(r["lines"]))
    s = spans.setdefault(key, {"text": " ".join(TEXT[l] for l in r["lines"]), "need": set(), "ep": r["ep"], "epic": r["lines"][0][:3]})
    s["need"] |= requirements(r, ref)
rows = list(spans.values())
print(f"{len(rows)} spans from {len(records)} records")
Y = {f: np.array([f in s["need"] for s in rows]) for f in FACETS}
docs = [nfc(s["text"]) for s in rows]
eps = np.array([s["ep"] for s in rows])
epics = np.array([s["epic"] for s in rows])


def clf_predict(train_idx, test_idx, y):
    if len(set(y[train_idx])) < 2:
        return np.full(len(test_idx), y[train_idx][0])
    vec = TfidfVectorizer(analyzer="char", ngram_range=(2, 4), min_df=2, sublinear_tf=True)
    X_train = vec.fit_transform([docs[i] for i in train_idx])
    X_test = vec.transform([docs[i] for i in test_idx])
    model = LogisticRegression(max_iter=2000, class_weight="balanced", C=2.0)
    model.fit(X_train, y[train_idx])
    return model.predict(X_test)


def cue_predict(test_idx, facet):
    return np.array([bool(re.search(nfc(CUES[facet]), docs[i])) for i in test_idx])


def measure(y_true, y_pred):
    return {"p": round(float(precision_score(y_true, y_pred, zero_division=0)), 2), "r": round(float(recall_score(y_true, y_pred, zero_division=0)), 2),
            "f1": round(float(f1_score(y_true, y_pred, zero_division=0)), 2)}


def run_split(splits, label):
    table = {}
    for facet in FACETS:
        y = Y[facet]
        pred_clf, pred_cue, truth = [], [], []
        for train, test in splits:
            pred_clf += list(clf_predict(train, test, y))
            pred_cue += list(cue_predict(test, facet))
            truth += list(y[test])
        truth = np.array(truth)
        table[facet] = {"base_rate": round(float(truth.mean()), 2), "always_no": 0.0,
                        "always_yes": measure(truth, np.ones_like(truth))["f1"],
                        "cue_rules": measure(truth, np.array(pred_cue)), "char_lr": measure(truth, np.array(pred_clf))}
    print(f"\n-- {label}")
    print(f"{'facet':8}{'share':>7}{'always yes':>12}{'cue P/R/F1':>18}{'char LR P/R/F1':>18}")
    for f, t in table.items():
        c, l = t["cue_rules"], t["char_lr"]
        print(f"{f:8}{t['base_rate']:7}{t['always_yes']:12}{c['p']:>8}/{c['r']}/{c['f1']:<5}{l['p']:>8}/{l['r']}/{l['f1']}")
    macro = {k: round(float(np.mean([t[k]["f1"] for t in table.values()])), 2) for k in ("cue_rules", "char_lr")}
    macro["always_yes"] = round(float(np.mean([t["always_yes"] for t in table.values()])), 2)
    print("macro F1:", macro)
    return {"facets": table, "macro_f1": macro}


idx = np.arange(len(rows))
loo = [(idx[eps != e], idx[eps == e]) for e in sorted(set(eps))]
cross = [(idx[epics == "SIL"], idx[epics == "MAN"]), (idx[epics == "MAN"], idx[epics == "SIL"])]
result = {"spans": len(rows), "leave_one_episode_out": run_split(loo, "leave one episode out"), "cross_epic": run_split(cross, "train one epic, test the other")}
(ROOT / "reports" / "detector_test.json").write_text(json.dumps(result, indent=1))
