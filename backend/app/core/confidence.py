from dataclasses import dataclass
from typing import List, Dict, Any, Optional
import math


@dataclass
class ConfidenceSignals:
    retrieval_similarity: float = 0.0
    metadata_quality: float = 0.0
    evidence_density: float = 0.0
    rule_alignment: float = 0.0
    context_completeness: float = 0.0

    WEIGHTS = {
        "retrieval_similarity": 0.30,
        "metadata_quality": 0.15,
        "evidence_density": 0.25,
        "rule_alignment": 0.20,
        "context_completeness": 0.10,
    }

    def compute_overall(self) -> float:
        total = (
            self.retrieval_similarity * self.WEIGHTS["retrieval_similarity"]
            + self.metadata_quality * self.WEIGHTS["metadata_quality"]
            + self.evidence_density * self.WEIGHTS["evidence_density"]
            + self.rule_alignment * self.WEIGHTS["rule_alignment"]
            + self.context_completeness * self.WEIGHTS["context_completeness"]
        )
        return round(min(max(total, 0.0), 1.0), 4)

    def to_dict(self) -> Dict[str, float]:
        return {
            "retrieval_similarity": round(self.retrieval_similarity, 4),
            "metadata_quality": round(self.metadata_quality, 4),
            "evidence_density": round(self.evidence_density, 4),
            "rule_alignment": round(self.rule_alignment, 4),
            "context_completeness": round(self.context_completeness, 4),
            "overall": self.compute_overall(),
        }


class ConfidenceEngine:
    def compute(
        self,
        query: str,
        retrieved_chunks: List[Dict[str, Any]],
        intent: str,
        answer: Optional[str] = None,
    ) -> ConfidenceSignals:
        signals = ConfidenceSignals()

        if retrieved_chunks:
            scores = [c.get("relevance_score", 0.0) for c in retrieved_chunks]
            signals.retrieval_similarity = sum(scores) / len(scores) if scores else 0.0
        
        signals.metadata_quality = self._assess_metadata_quality(retrieved_chunks)
        signals.evidence_density = self._assess_evidence_density(query, retrieved_chunks)
        signals.rule_alignment = self._assess_rule_alignment(intent, retrieved_chunks, answer)
        signals.context_completeness = self._assess_context_completeness(query, retrieved_chunks)

        return signals

    def _assess_metadata_quality(self, chunks: List[Dict[str, Any]]) -> float:
        if not chunks:
            return 0.0
        scores = []
        for chunk in chunks:
            score = 0.0
            if chunk.get("document_name"):
                score += 0.2
            if chunk.get("section_title"):
                score += 0.2
            if chunk.get("page_number"):
                score += 0.2
            if chunk.get("unit_type"):
                score += 0.2
            if chunk.get("tags"):
                score += 0.2
            scores.append(score)
        return sum(scores) / len(scores)

    def _assess_evidence_density(self, query: str, chunks: List[Dict[str, Any]]) -> float:
        if not chunks:
            return 0.0
        query_terms = set(query.lower().split())
        coverage_scores = []
        for chunk in chunks:
            content = chunk.get("content", "").lower()
            chunk_terms = set(content.split())
            overlap = len(query_terms & chunk_terms)
            coverage = overlap / len(query_terms) if query_terms else 0.0
            coverage_scores.append(min(coverage * 2, 1.0))
        
        quantity_bonus = min(len(chunks) / 5.0, 1.0) * 0.3
        content_quality = sum(coverage_scores) / len(coverage_scores) * 0.7
        return round(quantity_bonus + content_quality, 4)

    def _assess_rule_alignment(self, intent: str, chunks: List[Dict[str, Any]], answer: Optional[str]) -> float:
        base_scores = {"informational": 0.7, "analytical": 0.75, "advisory": 0.8}
        base = base_scores.get(intent, 0.7)

        if not chunks:
            return base * 0.5

        policy_chunks = sum(1 for c in chunks if c.get("unit_type") in ("policy", "requirement", "constraint"))
        if policy_chunks > 0:
            base = min(base + 0.1, 1.0)

        if answer and len(answer) > 200:
            base = min(base + 0.05, 1.0)

        return round(base, 4)

    def _assess_context_completeness(self, query: str, chunks: List[Dict[str, Any]]) -> float:
        if not chunks:
            return 0.0
        unique_docs = len(set(c.get("document_id", "") for c in chunks))
        doc_diversity = min(unique_docs / 3.0, 1.0)
        content_length = sum(len(c.get("content", "")) for c in chunks)
        length_score = min(content_length / 5000.0, 1.0)
        return round((doc_diversity * 0.4 + length_score * 0.6), 4)

    def interpret(self, overall: float) -> Dict[str, str]:
        if overall >= 0.85:
            return {"level": "high", "label": "High Confidence", "color": "green", "description": "Strong evidence base with high-quality retrieval and context coverage."}
        elif overall >= 0.65:
            return {"level": "medium", "label": "Moderate Confidence", "color": "amber", "description": "Adequate evidence but some gaps in coverage or metadata quality."}
        elif overall >= 0.40:
            return {"level": "low", "label": "Low Confidence", "color": "orange", "description": "Limited evidence. Results should be verified against source documents."}
        else:
            return {"level": "very_low", "label": "Very Low Confidence", "color": "red", "description": "Insufficient evidence. Expert review strongly recommended."}
