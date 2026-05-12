"""
Evidence Pathway Mapper — Causal Reasoning Chain Mapping

Maps how symptoms and wearable data causally link to hypotheses.
"""
import time


class EvidencePathwayMapper:
    def map_pathways(self, hypotheses, observations, wearable_data=None):
        res = {"generated_at": time.time(), "pathways": [], "strongest_pathway": None, "summary": ""}
        symptom_set = {o.get("symptom", "") for o in observations}

        for hyp in hypotheses:
            cond = hyp.get("condition", "unknown")
            conf = hyp.get("confidence", 0)
            matched = [e for e in hyp.get("evidence_for", []) if e in symptom_set]

            if not matched:
                continue

            pathway = {
                "condition": cond, "confidence": conf,
                "evidence_chain": [],
                "wearable_influence": False,
                "strength": "strong" if conf > 0.6 else "moderate" if conf > 0.3 else "emerging",
            }
            for s in matched:
                pathway["evidence_chain"].append({
                    "from": s.replace("_", " "), "type": "symptom",
                    "relationship": "supports", "to": cond,
                })

            if wearable_data:
                pathway["wearable_influence"] = True
                pathway["evidence_chain"].append({
                    "from": "wearable data", "type": "wearable",
                    "relationship": "augments", "to": cond,
                })

            res["pathways"].append(pathway)

        res["pathways"].sort(key=lambda p: p["confidence"], reverse=True)
        if res["pathways"]:
            res["strongest_pathway"] = res["pathways"][0]

        n = len(res["pathways"])
        res["summary"] = f"{n} evidence pathway{'s' if n != 1 else ''} mapped across the investigation."
        return res
