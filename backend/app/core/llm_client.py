import asyncio
import json
import time
from typing import Optional, List, Dict, Any
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from loguru import logger

from app.config import get_settings

settings = get_settings()

MOCK_RESPONSES = {
    "informational": "Based on the provided documentation, the system operates using a three-tier architecture with redundant failover mechanisms. The primary control unit interfaces with secondary monitoring systems through a dedicated CAN bus protocol operating at 500kbps. All critical parameters are logged to persistent storage at 100ms intervals.",
    "analytical": "Cross-referencing the maintenance logs against the operational specifications reveals three significant discrepancies: (1) Hydraulic pressure readings exceeded the defined threshold of 280 bar on 7 occasions in the past 30 days, (2) Filter replacement intervals are not aligned with the manufacturer-recommended schedule, and (3) Temperature sensor calibration was last performed 14 months ago, exceeding the 12-month requirement. These findings collectively indicate elevated risk of component failure.",
    "advisory": "Based on the analytical findings, the following actions are recommended in order of priority: (1) IMMEDIATE: Schedule hydraulic system inspection within 48 hours to assess the root cause of pressure spikes, (2) HIGH: Replace all overdue filters within the current maintenance window, (3) MEDIUM: Arrange temperature sensor recalibration within the next 30 days. Estimated risk reduction if all actions are completed: 73% based on similar historical interventions documented in the maintenance knowledge base.",
}


class LLMClient:
    def __init__(self):
        self.client = httpx.AsyncClient(
            base_url=settings.openrouter_base_url,
            headers={
                "Authorization": f"Bearer {settings.openrouter_api_key}",
                "HTTP-Referer": "https://reasonedai.platform",
                "X-Title": "ReasonedAI Platform",
            },
            timeout=120.0,
        )

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        retry=retry_if_exception_type(httpx.HTTPStatusError),
    )
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.1,
        max_tokens: int = 4096,
        stream: bool = False,
    ) -> Dict[str, Any]:
        if settings.mock_llm:
            await asyncio.sleep(0.5)
            last_user_msg = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
            mock_key = "informational"
            if "analy" in last_user_msg.lower():
                mock_key = "analytical"
            elif "recommend" in last_user_msg.lower() or "advise" in last_user_msg.lower():
                mock_key = "advisory"
            return {
                "choices": [{"message": {"content": MOCK_RESPONSES[mock_key]}}],
                "usage": {"prompt_tokens": 500, "completion_tokens": 200, "total_tokens": 700},
                "model": "mock/model",
            }

        target_model = model or settings.default_model
        payload = {
            "model": target_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": stream,
        }

        try:
            response = await self.client.post("/chat/completions", json=payload)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"LLM API error {e.response.status_code}: {e.response.text}")
            if e.response.status_code in (429, 502, 503, 504):
                raise
            if target_model != settings.fallback_model:
                logger.warning(f"Falling back to {settings.fallback_model}")
                payload["model"] = settings.fallback_model
                response = await self.client.post("/chat/completions", json=payload)
                response.raise_for_status()
                return response.json()
            raise

    async def classify_intent(self, query: str) -> str:
        prompt = f"""Classify the following query into exactly one of these categories:
- INFORMATIONAL: seeking factual information or explanations
- ANALYTICAL: requesting analysis, comparison, or pattern identification  
- ADVISORY: requesting recommendations, decisions, or action plans

Query: {query}

Respond with ONLY one word: INFORMATIONAL, ANALYTICAL, or ADVISORY"""

        result = await self.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            max_tokens=20,
        )
        raw = result["choices"][0]["message"]["content"].strip().upper()
        if "ANALYTICAL" in raw:
            return "analytical"
        elif "ADVISORY" in raw:
            return "advisory"
        return "informational"

    async def extract_knowledge_units(self, section_content: str, section_title: str) -> List[Dict[str, Any]]:
        prompt = f"""You are a knowledge extraction expert. Analyze the following document section and extract structured knowledge units.

Section Title: {section_title}
Section Content:
{section_content[:3000]}

Extract all distinct knowledge units and classify each as one of:
requirement, constraint, policy, definition, risk, recommendation, procedure, responsibility, threshold, dependency, fact

Return a JSON array with this structure:
[
  {{
    "type": "requirement",
    "title": "Short descriptive title",
    "content": "The exact knowledge unit content",
    "confidence": 0.95,
    "tags": ["tag1", "tag2"]
  }}
]

Return ONLY valid JSON, no other text."""

        try:
            result = await self.chat_completion(
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=2000,
            )
            content = result["choices"][0]["message"]["content"].strip()
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            return json.loads(content)
        except Exception as e:
            logger.warning(f"Knowledge unit extraction failed: {e}")
            return []

    async def extract_entities(self, text: str) -> List[Dict[str, Any]]:
        prompt = f"""Extract named entities from the following text. Categories: organization, person, date, location, standard, threshold_value, technical_parameter, responsibility.

Text: {text[:2000]}

Return JSON array:
[{{"type": "organization", "value": "entity text", "confidence": 0.9, "context": "surrounding context"}}]

Return ONLY valid JSON."""

        try:
            result = await self.chat_completion(
                messages=[{"role": "user", "content": prompt}],
                temperature=0.0,
                max_tokens=1000,
            )
            content = result["choices"][0]["message"]["content"].strip()
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            return json.loads(content)
        except Exception as e:
            logger.warning(f"Entity extraction failed: {e}")
            return []

    async def generate_agent_blueprint(self, document_contents: List[str], document_names: List[str]) -> Dict[str, Any]:
        combined = "\n\n---\n\n".join(
            f"Document: {name}\n{content[:2000]}" for name, content in zip(document_names, document_contents)
        )

        prompt = f"""You are an AI agent architect. Analyze these documents and extract a structured agent blueprint.

Documents:
{combined[:6000]}

Generate a comprehensive agent blueprint as JSON with this structure:
{{
  "roles": [
    {{
      "name": "Role Name",
      "description": "What this agent does",
      "responsibilities": ["resp1", "resp2"],
      "required_knowledge": ["knowledge source 1"],
      "tools": ["tool1", "tool2"],
      "decision_authority": "Description of what decisions this agent can make"
    }}
  ],
  "workflows": [
    {{
      "step_id": "step_001",
      "name": "Step Name",
      "description": "What happens here",
      "agent_role": "Role Name",
      "inputs": ["input1"],
      "outputs": ["output1"],
      "decision_points": [{{"condition": "if X", "action": "do Y"}}],
      "escalation_triggers": ["trigger1"]
    }}
  ],
  "decision_rules": [
    {{"rule_id": "r001", "condition": "condition text", "action": "action text", "priority": "high"}}
  ],
  "escalation_paths": [
    {{"trigger": "trigger", "escalate_to": "role", "notification": "message template"}}
  ],
  "required_knowledge_sources": ["source1", "source2"],
  "system_prompt": "You are an AI agent specialized in... [full system prompt here]"
}}

Return ONLY valid JSON."""

        try:
            result = await self.chat_completion(
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=4000,
            )
            content = result["choices"][0]["message"]["content"].strip()
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            return json.loads(content)
        except Exception as e:
            logger.error(f"Agent blueprint generation failed: {e}")
            return {"roles": [], "workflows": [], "decision_rules": [], "escalation_paths": [], "required_knowledge_sources": [], "system_prompt": ""}

    async def generate_reasoning_response(
        self,
        query: str,
        intent: str,
        evidence_chunks: List[Dict[str, Any]],
        reasoning_depth: str = "full",
    ) -> Dict[str, Any]:
        evidence_text = "\n\n".join(
            f"[Source: {c.get('document_name', 'Unknown')} | Section: {c.get('section_title', 'N/A')}]\n{c.get('content', '')}"
            for c in evidence_chunks[:8]
        )

        layer_instruction = {
            "informational": "Provide a clear, factual answer based strictly on the provided evidence.",
            "analytical": "Analyze the evidence to identify patterns, relationships, inconsistencies, and dependencies. Structure your analysis logically.",
            "advisory": "Based on the evidence and analysis, provide specific, prioritized recommendations with rationale.",
        }.get(intent, "Provide a comprehensive response.")

        prompt = f"""You are a ReasonedAI reasoning engine. {layer_instruction}

User Query: {query}

Evidence from Knowledge Base:
{evidence_text}

Provide your response in this JSON format:
{{
  "answer": "Your comprehensive response here",
  "reasoning_trace": [
    {{"step": 1, "layer": "informational", "action": "Retrieved evidence", "result": "Found X relevant chunks", "confidence": 0.9}},
    {{"step": 2, "layer": "analytical", "action": "Cross-referenced sources", "result": "Identified key relationships", "confidence": 0.85}}
  ],
  "key_evidence_ids": ["id1", "id2"]
}}

Return ONLY valid JSON."""

        start = time.time()
        result = await self.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=3000,
        )
        latency_ms = int((time.time() - start) * 1000)

        content = result["choices"][0]["message"]["content"].strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]

        try:
            parsed = json.loads(content)
        except Exception:
            parsed = {
                "answer": content,
                "reasoning_trace": [],
                "key_evidence_ids": [],
            }

        return {
            **parsed,
            "model_used": result.get("model", settings.default_model),
            "tokens_used": result.get("usage", {}).get("total_tokens", 0),
            "latency_ms": latency_ms,
        }

    async def close(self):
        await self.client.aclose()


_llm_client: Optional[LLMClient] = None


def get_llm_client() -> LLMClient:
    global _llm_client
    if _llm_client is None:
        _llm_client = LLMClient()
    return _llm_client
