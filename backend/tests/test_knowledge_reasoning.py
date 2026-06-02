import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_knowledge_search_empty(authenticated_client: AsyncClient):
    response = await authenticated_client.post("/api/v1/knowledge/search", json={"query": "test requirements"})
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert "query" in data
    assert "total_results" in data


@pytest.mark.asyncio
async def test_knowledge_search_missing_query(authenticated_client: AsyncClient):
    response = await authenticated_client.post("/api/v1/knowledge/search", json={})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_knowledge_units_list(authenticated_client: AsyncClient):
    response = await authenticated_client.get("/api/v1/knowledge/units")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, (list, dict))


@pytest.mark.asyncio
async def test_knowledge_stats(authenticated_client: AsyncClient):
    response = await authenticated_client.get("/api/v1/knowledge/stats/summary")
    assert response.status_code == 200
    data = response.json()
    assert "total_units" in data


@pytest.mark.asyncio
async def test_reasoning_query(authenticated_client: AsyncClient):
    response = await authenticated_client.post("/api/v1/reasoning/query", json={
        "query": "What are the key safety requirements?",
        "reasoning_depth": "quick",
        "include_evidence": True,
    })
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "confidence" in data
    assert "query_id" in data
    assert "reasoning_trace" in data
    assert "evidence" in data


@pytest.mark.asyncio
async def test_reasoning_query_empty(authenticated_client: AsyncClient):
    response = await authenticated_client.post("/api/v1/reasoning/query", json={"query": ""})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_reasoning_history(authenticated_client: AsyncClient):
    response = await authenticated_client.get("/api/v1/reasoning/history")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
