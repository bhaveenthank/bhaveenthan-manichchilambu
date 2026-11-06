"""
Turn candidate features into one calibrated probability: "this candidate is backed by its lines".

It's a plain logistic regression on purpose. Few labels, and you can read off why an edge scored
what it did. Cross-validation holds out whole cantos, because neighbouring lines share errors.

The score means extraction correctness and nothing else. A false accusation correctly read gets a
high score: the graph is confident the accusation was made, the mood says it's only a claim.
"""
import json

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, log_loss
from sklearn.model_selection import GroupKFold


def fit_and_check(X, y, groups, bins=5, folds=5):
    X, y, groups = np.asarray(X, float), np.asarray(y, int), np.asarray(groups)
    k = min(folds, len(set(groups)))
    probs = np.zeros(len(y))
    for train, test in GroupKFold(n_splits=k).split(X, y, groups):
        if len(set(y[train])) < 2:
            probs[test] = y[train].mean()
            continue
        model = LogisticRegression(max_iter=1000, class_weight=None)
        model.fit(X[train], y[train])
        probs[test] = model.predict_proba(X[test])[:, 1]
    edges = np.linspace(0, 1, bins + 1)
    table = []
    for lo, hi in zip(edges[:-1], edges[1:]):
        mask = (probs >= lo) & (probs < hi if hi < 1 else probs <= hi)
        if mask.sum():
            table.append({"bin": f"{lo:.1f}-{hi:.1f}", "n": int(mask.sum()), "mean_score": round(float(probs[mask].mean()), 3),
                          "share_correct": round(float(y[mask].mean()), 3)})
    return {"n": len(y), "base_rate": round(float(y.mean()), 3), "brier": round(float(brier_score_loss(y, probs)), 3),
            "brier_baseline": round(float(brier_score_loss(y, np.full(len(y), y.mean()))), 3),
            "log_loss": round(float(log_loss(y, np.clip(probs, 1e-6, 1 - 1e-6))), 3), "reliability": table}
