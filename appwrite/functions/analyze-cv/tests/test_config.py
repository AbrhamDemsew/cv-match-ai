"""Unit tests for config module."""

import pytest
from src.config import Config, load_config


def test_load_config_valid() -> None:
    env = {
        "GEMINI_API_KEY": "test-gemini-key",
        "GEMINI_MODEL": "gemini-2.0-flash",
        "APPWRITE_API_KEY": "test-appwrite-key",
        "APPWRITE_FUNCTION_API_ENDPOINT": "https://fra.cloud.appwrite.io/v1",
        "APPWRITE_FUNCTION_PROJECT_ID": "test-project-id",
        "APPWRITE_DATABASE_ID": "custom-db",
        "APPWRITE_RESUMES_BUCKET_ID": "custom-resumes",
    }
    cfg = load_config(env)
    assert isinstance(cfg, Config)
    assert cfg.gemini_api_key == "test-gemini-key"
    assert cfg.gemini_model == "gemini-2.0-flash"
    assert cfg.appwrite_api_key == "test-appwrite-key"
    assert cfg.appwrite_endpoint == "https://fra.cloud.appwrite.io/v1"
    assert cfg.appwrite_project_id == "test-project-id"
    assert cfg.database_id == "custom-db"
    assert cfg.resumes_bucket_id == "custom-resumes"
    assert cfg.scoring_version == "1.0"


def test_load_config_defaults() -> None:
    env = {
        "GEMINI_API_KEY": "test-gemini-key",
        "APPWRITE_API_KEY": "test-appwrite-key",
        "APPWRITE_FUNCTION_API_ENDPOINT": "https://fra.cloud.appwrite.io/v1",
        "APPWRITE_FUNCTION_PROJECT_ID": "test-project-id",
    }
    cfg = load_config(env)
    assert cfg.gemini_model == "gemini-2.0-flash"
    assert cfg.database_id == "cvmatch"
    assert cfg.resumes_bucket_id == "resumes"
    assert cfg.scoring_version == "1.0"


def test_load_config_missing_required() -> None:
    env = {}
    with pytest.raises(RuntimeError) as exc_info:
        load_config(env)
    msg = str(exc_info.value)
    assert "GEMINI_API_KEY" in msg
    assert "APPWRITE_API_KEY" in msg
    assert "APPWRITE_FUNCTION_API_ENDPOINT" in msg
    assert "APPWRITE_FUNCTION_PROJECT_ID" in msg


def test_load_config_empty_strings_treated_as_missing() -> None:
    env = {
        "GEMINI_API_KEY": "   ",
        "APPWRITE_API_KEY": "",
        "APPWRITE_FUNCTION_API_ENDPOINT": "",
        "APPWRITE_FUNCTION_PROJECT_ID": "   ",
    }
    with pytest.raises(RuntimeError) as exc_info:
        load_config(env)
    msg = str(exc_info.value)
    assert "GEMINI_API_KEY" in msg
    assert "APPWRITE_API_KEY" in msg


def test_load_config_endpoint_and_project_fallbacks() -> None:
    env = {
        "GEMINI_API_KEY": "key",
        "APPWRITE_API_KEY": "appwrite-key",
        "APPWRITE_FUNCTION_ENDPOINT": "https://fallback.cloud.appwrite.io/v1",
        "APPWRITE_PROJECT_ID": "fallback-project",
    }
    cfg = load_config(env)
    assert cfg.appwrite_endpoint == "https://fallback.cloud.appwrite.io/v1"
    assert cfg.appwrite_project_id == "fallback-project"
