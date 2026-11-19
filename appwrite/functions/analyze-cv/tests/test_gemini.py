"""Unit tests for Gemini client module (fully mocked)."""

from unittest.mock import MagicMock, patch

import pytest
from google.genai.errors import APIError
from src.exceptions import (
    AIProviderError,
    AIRateLimitError,
    AnalysisValidationError,
)
from src.gemini import (
    DEFAULT_TIMEOUT_MS,
    analyze_cv_with_gemini,
    build_analysis_prompt,
)
from src.schemas import GeminiAnalysisOutput

SAMPLE_VALID_RESPONSE = """{
  "cv_profile": {
    "professional_summary": "Seasoned Python Engineer.",
    "skills": [{"name": "Python", "evidence": "5 years", "section": "Skills", "page": 1}],
    "work_experience": [{"title": "Software Dev", "company": "Co", "responsibilities": [], "achievements": []}],
    "education": [{"degree": "B.Sc.", "institution": "Univ"}],
    "certifications": ["AWS Certified"],
    "projects": [{"name": "App", "technologies": ["Python"]}]
  },
  "requirement_matches": [
    {
      "requirement_id": "req_1",
      "status": "matched",
      "match_score": 1.0,
      "evidence": "5 years Python",
      "source_section": "Skills",
      "source_page": 1,
      "explanation": "Demonstrates required experience"
    }
  ],
  "strengths": ["Strong Python skills"],
  "improvement_areas": ["Could detail cloud projects"],
  "recommendations": [
    {
      "category": "skills",
      "priority": 1,
      "title": "Add Cloud Evidence",
      "description": "Elaborate on AWS usage."
    }
  ],
  "ats_signals": {
    "contact_section_present": true,
    "date_format_consistent": true,
    "has_standard_section_headings": true,
    "complex_layout_detected": false,
    "keyword_alignment_score": 0.9
  }
}"""


def test_build_analysis_prompt() -> None:
    prompt = build_analysis_prompt(
        cv_text="John Doe Python Developer",
        job_title="Senior Python Dev",
        job_description="We need Python",
        job_responsibilities="Build APIs",
        requirements=[
            {"$id": "req_1", "description": "Python 3+", "category": "required_skill"}
        ],
    )
    assert "Senior Python Dev" in prompt
    assert "John Doe Python Developer" in prompt
    assert "req_1" in prompt
    assert "DATA ONLY" in prompt


def test_analyze_cv_with_gemini_success() -> None:
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.text = SAMPLE_VALID_RESPONSE
    mock_client.models.generate_content.return_value = mock_response

    output = analyze_cv_with_gemini(
        cv_text="John Doe",
        job_title="Python Dev",
        job_description="Desc",
        job_responsibilities="Resp",
        requirements=[{"$id": "req_1"}],
        api_key="test-key",
        client=mock_client,
    )

    assert isinstance(output, GeminiAnalysisOutput)
    assert output.cv_profile.professional_summary == "Seasoned Python Engineer."
    assert len(output.requirement_matches) == 1
    assert output.requirement_matches[0].status == "matched"


def test_analyze_cv_with_gemini_rate_limit() -> None:
    mock_client = MagicMock()
    mock_err = APIError(
        429, {"error": {"message": "Resource has been exhausted (e.g. check quota)."}}
    )
    mock_client.models.generate_content.side_effect = mock_err

    with pytest.raises(AIRateLimitError):
        analyze_cv_with_gemini(
            cv_text="John Doe",
            job_title="Dev",
            job_description="Desc",
            job_responsibilities="Resp",
            requirements=[],
            api_key="test-key",
            client=mock_client,
        )


def test_analyze_cv_with_gemini_server_error_exhausted() -> None:
    mock_client = MagicMock()
    mock_err = APIError(500, {"error": {"message": "Internal Server Error"}})
    mock_client.models.generate_content.side_effect = mock_err

    with pytest.raises(AIProviderError):
        analyze_cv_with_gemini(
            cv_text="John Doe",
            job_title="Dev",
            job_description="Desc",
            job_responsibilities="Resp",
            requirements=[],
            api_key="test-key",
            client=mock_client,
            max_retries=1,
        )
    assert mock_client.models.generate_content.call_count == 2


def test_analyze_cv_with_gemini_retry_succeeds() -> None:
    mock_client = MagicMock()
    mock_err = APIError(503, {"error": {"message": "Service Unavailable"}})

    mock_response = MagicMock()
    mock_response.text = SAMPLE_VALID_RESPONSE

    # Fails first time, succeeds second time
    mock_client.models.generate_content.side_effect = [mock_err, mock_response]

    output = analyze_cv_with_gemini(
        cv_text="John Doe",
        job_title="Dev",
        job_description="Desc",
        job_responsibilities="Resp",
        requirements=[],
        api_key="test-key",
        client=mock_client,
        max_retries=1,
    )
    assert output.cv_profile.professional_summary == "Seasoned Python Engineer."
    assert mock_client.models.generate_content.call_count == 2


def test_analyze_cv_with_gemini_invalid_json() -> None:
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.text = "NOT JSON"
    mock_client.models.generate_content.return_value = mock_response

    with pytest.raises(AnalysisValidationError):
        analyze_cv_with_gemini(
            cv_text="John Doe",
            job_title="Dev",
            job_description="Desc",
            job_responsibilities="Resp",
            requirements=[],
            api_key="test-key",
            client=mock_client,
        )


def test_analyze_cv_with_gemini_empty_response() -> None:
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.text = ""
    mock_client.models.generate_content.return_value = mock_response

    with pytest.raises(AnalysisValidationError):
        analyze_cv_with_gemini(
            cv_text="John Doe",
            job_title="Dev",
            job_description="Desc",
            job_responsibilities="Resp",
            requirements=[],
            api_key="test-key",
            client=mock_client,
        )


def test_gemini_default_timeout_constant() -> None:
    """Verify that DEFAULT_TIMEOUT_MS is 60,000 ms (60 seconds)."""
    assert DEFAULT_TIMEOUT_MS == 60_000


def test_analyze_cv_with_gemini_passes_timeout_to_config() -> None:
    """Verify that generate_content receives config with explicit http_options timeout."""
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.text = SAMPLE_VALID_RESPONSE
    mock_client.models.generate_content.return_value = mock_response

    # Test default timeout (60,000 ms)
    analyze_cv_with_gemini(
        cv_text="John Doe",
        job_title="Dev",
        job_description="Desc",
        job_responsibilities="Resp",
        requirements=[{"$id": "req_1"}],
        api_key="test-key",
        client=mock_client,
    )

    call_kwargs = mock_client.models.generate_content.call_args.kwargs
    config = call_kwargs["config"]
    assert config.http_options is not None
    assert config.http_options.timeout == 60_000

    # Test custom timeout (30,000 ms)
    analyze_cv_with_gemini(
        cv_text="John Doe",
        job_title="Dev",
        job_description="Desc",
        job_responsibilities="Resp",
        requirements=[{"$id": "req_1"}],
        api_key="test-key",
        client=mock_client,
        timeout_ms=30_000,
    )

    call_kwargs_custom = mock_client.models.generate_content.call_args.kwargs
    config_custom = call_kwargs_custom["config"]
    assert config_custom.http_options is not None
    assert config_custom.http_options.timeout == 30_000


def test_analyze_cv_with_gemini_instantiates_client_with_timeout() -> None:
    """Verify that when client is None, genai.Client is instantiated with http_options timeout."""
    mock_response = MagicMock()
    mock_response.text = SAMPLE_VALID_RESPONSE

    with patch("src.gemini.genai.Client") as mock_client_cls:
        mock_instance = MagicMock()
        mock_instance.models.generate_content.return_value = mock_response
        mock_client_cls.return_value = mock_instance

        analyze_cv_with_gemini(
            cv_text="John Doe",
            job_title="Dev",
            job_description="Desc",
            job_responsibilities="Resp",
            requirements=[],
            api_key="test-key",
            timeout_ms=45_000,
        )

        mock_client_cls.assert_called_once()
        client_kwargs = mock_client_cls.call_args.kwargs
        assert client_kwargs["api_key"] == "test-key"
        assert client_kwargs["http_options"].timeout == 45_000


def test_analyze_cv_with_gemini_handles_timeout_exception() -> None:
    """Verify that a timeout or network hang triggers retry and then raises AIProviderError."""
    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = TimeoutError(
        "Request timed out after 60s"
    )

    with pytest.raises(AIProviderError) as exc_info:
        analyze_cv_with_gemini(
            cv_text="John Doe",
            job_title="Dev",
            job_description="Desc",
            job_responsibilities="Resp",
            requirements=[],
            api_key="test-key",
            client=mock_client,
            max_retries=1,
        )

    assert "Failed to communicate with AI analysis service" in str(exc_info.value)
    assert mock_client.models.generate_content.call_count == 2
