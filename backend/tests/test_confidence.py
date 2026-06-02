import pytest
from app.core.confidence import ConfidenceEngine, ConfidenceSignals


class TestConfidenceSignals:
    def test_overall_score_range(self):
        signals = ConfidenceSignals(
            retrieval_similarity=0.8,
            metadata_quality=0.7,
            evidence_density=0.9,
            rule_alignment=0.75,
            context_completeness=0.85,
        )
        overall = signals.compute_overall()
        assert 0.0 <= overall <= 1.0

    def test_zero_signals(self):
        signals = ConfidenceSignals()
        assert signals.compute_overall() == 0.0

    def test_perfect_signals(self):
        signals = ConfidenceSignals(
            retrieval_similarity=1.0,
            metadata_quality=1.0,
            evidence_density=1.0,
            rule_alignment=1.0,
            context_completeness=1.0,
        )
        assert signals.compute_overall() == 1.0

    def test_to_dict_includes_overall(self):
        signals = ConfidenceSignals(retrieval_similarity=0.5, evidence_density=0.6)
        d = signals.to_dict()
        assert "overall" in d
        assert "retrieval_similarity" in d
        assert "evidence_density" in d
        assert "metadata_quality" in d


class TestConfidenceEngine:
    def setup_method(self):
        self.engine = ConfidenceEngine()

    def test_compute_with_no_chunks(self):
        signals = self.engine.compute("test query", [], "informational")
        assert signals.retrieval_similarity == 0.0
        assert signals.evidence_density == 0.0

    def test_compute_with_chunks(self):
        chunks = [
            {
                "document_id": "doc1",
                "document_name": "Test Doc",
                "section_title": "Section 1",
                "content": "This is test content about safety requirements",
                "unit_type": "requirement",
                "page_number": 1,
                "relevance_score": 0.85,
                "tags": ["safety", "requirement"],
            },
            {
                "document_id": "doc2",
                "document_name": "Another Doc",
                "section_title": "Compliance",
                "content": "Compliance policies must be followed at all times",
                "unit_type": "policy",
                "page_number": 3,
                "relevance_score": 0.72,
                "tags": ["compliance"],
            },
        ]
        signals = self.engine.compute("test query about safety", chunks, "informational")
        assert signals.retrieval_similarity > 0
        assert signals.metadata_quality > 0
        assert 0 <= signals.compute_overall() <= 1

    def test_interpret_high_confidence(self):
        interpretation = self.engine.interpret(0.9)
        assert interpretation["level"] == "high"
        assert interpretation["color"] == "green"

    def test_interpret_low_confidence(self):
        interpretation = self.engine.interpret(0.3)
        assert interpretation["level"] == "very_low"
        assert interpretation["color"] == "red"

    def test_interpret_medium_confidence(self):
        interpretation = self.engine.interpret(0.7)
        assert interpretation["level"] == "medium"
