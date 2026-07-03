"""Self-check for backend/providers.py — mocks the SDK clients, no network calls.
Run directly: python backend/test_providers.py
"""
import os
from unittest.mock import MagicMock, patch

import config
from providers import MissingAPIKeyError, stream_reply


def test_missing_api_key_raises():
    os.environ.pop("GROQ_API_KEY", None)
    try:
        list(stream_reply("groq", [{"role": "user", "content": "oi"}]))
        raise AssertionError("expected MissingAPIKeyError")
    except MissingAPIKeyError:
        pass


def test_openai_branch_yields_text_chunks():
    os.environ["GROQ_API_KEY"] = "fake-key"

    fake_chunk_1 = MagicMock()
    fake_chunk_1.choices = [MagicMock(delta=MagicMock(content="Olá"))]
    fake_chunk_2 = MagicMock()
    fake_chunk_2.choices = [MagicMock(delta=MagicMock(content=" mundo"))]

    fake_client = MagicMock()
    fake_client.chat.completions.create.return_value = [fake_chunk_1, fake_chunk_2]

    with patch("providers.openai.OpenAI", return_value=fake_client) as fake_ctor:
        result = list(stream_reply("groq", [{"role": "user", "content": "oi"}]))

    assert result == ["Olá", " mundo"], result

    fake_ctor.assert_called_once_with(api_key="fake-key", base_url=config.PROVIDERS["groq"]["base_url"])
    call_kwargs = fake_client.chat.completions.create.call_args.kwargs
    assert call_kwargs["model"] == config.PROVIDERS["groq"]["model"]
    assert call_kwargs["messages"][0] == {"role": "system", "content": config.SYSTEM_PROMPT}
    assert call_kwargs["messages"][1] == {"role": "user", "content": "oi"}
    assert call_kwargs["stream"] is True


def test_anthropic_branch_yields_text_chunks():
    os.environ["ANTHROPIC_API_KEY"] = "fake-key"

    fake_stream_cm = MagicMock()
    fake_stream_cm.__enter__.return_value.text_stream = iter(["Olá", " mundo"])
    fake_stream_cm.__exit__.return_value = False

    fake_client = MagicMock()
    fake_client.messages.stream.return_value = fake_stream_cm

    with patch("providers.anthropic.Anthropic", return_value=fake_client) as fake_ctor:
        result = list(stream_reply("claude", [{"role": "user", "content": "oi"}]))

    assert result == ["Olá", " mundo"], result

    fake_ctor.assert_called_once_with(api_key="fake-key")
    call_kwargs = fake_client.messages.stream.call_args.kwargs
    assert call_kwargs["model"] == config.PROVIDERS["claude"]["model"]
    assert call_kwargs["system"] == config.SYSTEM_PROMPT
    assert call_kwargs["messages"] == [{"role": "user", "content": "oi"}]


if __name__ == "__main__":
    test_missing_api_key_raises()
    test_openai_branch_yields_text_chunks()
    test_anthropic_branch_yields_text_chunks()
    print("OK - providers.py adapter valid")
