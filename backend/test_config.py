"""Self-check for backend/config.py — validates provider registry shape.
Run directly: python backend/test_config.py
"""
from config import PROVIDERS, SYSTEM_PROMPT, get_api_key

REQUIRED_KEYS = {"label", "sdk", "base_url", "env", "model"}
VALID_SDKS = {"openai", "anthropic"}
EXPECTED_PROVIDERS = {"groq", "grok", "gemini", "chatgpt", "deepseek", "claude"}


def test_all_providers_present():
    assert set(PROVIDERS.keys()) == EXPECTED_PROVIDERS, PROVIDERS.keys()


def test_provider_shape():
    for provider_id, cfg in PROVIDERS.items():
        missing = REQUIRED_KEYS - cfg.keys()
        assert not missing, f"{provider_id} missing keys: {missing}"
        assert cfg["sdk"] in VALID_SDKS, f"{provider_id} has invalid sdk: {cfg['sdk']}"
        assert cfg["env"], f"{provider_id} has empty env var name"
        assert cfg["model"], f"{provider_id} has empty model name"
        assert cfg["label"], f"{provider_id} has empty label"


def test_system_prompt_defined():
    assert isinstance(SYSTEM_PROMPT, str) and len(SYSTEM_PROMPT) > 20


def test_get_api_key_reads_env(monkeypatch_env=None):
    import os

    os.environ["GROQ_API_KEY"] = "test-value-123"
    assert get_api_key("groq") == "test-value-123"
    del os.environ["GROQ_API_KEY"]
    assert get_api_key("groq") is None


if __name__ == "__main__":
    test_all_providers_present()
    test_provider_shape()
    test_system_prompt_defined()
    test_get_api_key_reads_env()
    print("OK - config.py valid")
