import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_documents_empty(authenticated_client: AsyncClient):
    response = await authenticated_client.get("/api/v1/documents/")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert isinstance(data["items"], list)


@pytest.mark.asyncio
async def test_get_nonexistent_document(authenticated_client: AsyncClient):
    response = await authenticated_client.get("/api/v1/documents/nonexistent-id")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_upload_unsupported_format(authenticated_client: AsyncClient):
    content = b"test content"
    response = await authenticated_client.post(
        "/api/v1/documents/upload",
        files={"file": ("test.xyz", content, "application/octet-stream")},
    )
    assert response.status_code == 415


@pytest.mark.asyncio
async def test_upload_txt_document(authenticated_client: AsyncClient):
    content = b"This is a test document with important content for testing purposes."
    response = await authenticated_client.post(
        "/api/v1/documents/upload",
        files={"file": ("test_doc.txt", content, "text/plain")},
        data={"domain": "testing", "tags": "test,unit-test"},
    )
    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert data["format"] == "txt"
    assert data["status"] == "pending"
    return data["id"]


@pytest.mark.asyncio
async def test_delete_nonexistent_document(authenticated_client: AsyncClient):
    response = await authenticated_client.delete("/api/v1/documents/does-not-exist")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_document_sections_not_processed(authenticated_client: AsyncClient):
    content = b"Test document for sections."
    upload_response = await authenticated_client.post(
        "/api/v1/documents/upload",
        files={"file": ("sections_test.txt", content, "text/plain")},
    )
    doc_id = upload_response.json()["id"]
    response = await authenticated_client.get(f"/api/v1/documents/{doc_id}/sections")
    assert response.status_code in (200, 404)
