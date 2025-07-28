import pytest
import requests
from fastapi.testclient import TestClient
from unittest.mock import patch, mock_open, MagicMock

# Mock the agents before they are imported by main
import sys
sys.modules['matlab'] = MagicMock()
sys.modules['matlab.engine'] = MagicMock()

from backend.main import app, load_prompt, AppError, ErrorCodes

client = TestClient(app)

# --- Tests for load_prompt ---

def test_load_prompt_success():
    """ Tests successful loading and formatting of a prompt. """
    mock_content = "Hello, {name}!"
    mock_data = {"name": "World"}
    expected = "Hello, World!"

    with patch("builtins.open", mock_open(read_data=mock_content)) as mock_file:
        result = load_prompt("dummy.txt", mock_data)
        mock_file.assert_called_once_with("prompts/dummy.txt", "r", encoding="utf-8")
        assert result == expected

def test_load_prompt_file_not_found():
    """ Tests that AppError is raised for a missing prompt file. """
    with pytest.raises(AppError) as excinfo:
        load_prompt("non_existent.txt", {})
    assert excinfo.value.error_code == ErrorCodes.FILE_NOT_FOUND

def test_load_prompt_missing_placeholder():
    """ Tests that AppError is raised for missing data. """
    mock_content = "Hello, {name}!"
    mock_data = {"other_key": "value"} # 'name' is missing

    with patch("builtins.open", mock_open(read_data=mock_content)):
        with pytest.raises(AppError) as excinfo:
            load_prompt("dummy.txt", mock_data)
        assert excinfo.value.error_code == ErrorCodes.INVALID_INPUT

# --- Tests for /api/test-connection ---

@patch('requests.get')
def test_test_connection_success(mock_get):
    """ Tests the connection success scenario for a valid provider. """
    mock_get.return_value.status_code = 200
    response = client.post("/api/test-connection", json={"provider": "google"})
    assert response.status_code == 200
    assert response.json() == {
        "status": "success",
        "provider": "google",
        "message": "Successfully connected to google."
    }

@patch('requests.get')
def test_test_connection_failure(mock_get):
    """ Tests the connection failure scenario. """
    mock_get.side_effect = requests.exceptions.RequestException("Test error")
    response = client.post("/api/test-connection", json={"provider": "openai"})
    assert response.status_code == 400 # Should be handled by AppError handler
    json_response = response.json()
    assert json_response["error_code"] == ErrorCodes.AI_API_ERROR
    assert "Connection to openai failed" in json_response["message"]

def test_test_connection_invalid_provider():
    """ Tests the case of an invalid provider. """
    response = client.post("/api/test-connection", json={"provider": "invalid_provider"})
    # This will now raise an AppError, which our handler will catch and return a 400
    assert response.status_code == 400
    json_response = response.json()
    assert json_response["error_code"] == ErrorCodes.INVALID_INPUT
    assert "Invalid provider." in json_response["message"]
