import json
import re
from typing import Any

from app.config import settings

SYSTEM_PROMPT = """You are a concise college assistant (Jarvis-style). You help with notes, reminders, weekly class timetable, opening study links or safe desktop apps, and general Q&A.

When the user wants to OPEN a website or app, include a single line at the very end of your reply using this exact machine-readable format on its own line:
ACTIONS_JSON: [{"type":"open_url","target":"https://..."}] or [{"type":"open_app","target":"notepad"}]
Allowed open_app targets only: notepad, calculator, chrome, edge, vscode, explorer
For open_url use full https URLs. If no open action is needed, end with: ACTIONS_JSON: []

When the user asks to remember something at a time, acknowledge and say they can confirm in the Reminders panel; keep answers short.

Current context will include upcoming reminders and today's schedule snippets when provided.

Always stay helpful, brief, and student-focused."""


def _extract_actions(reply: str) -> tuple[str, list[dict[str, str]]]:
    match = re.search(r"ACTIONS_JSON:\s*(\[[\s\S]*?\])\s*$", reply.strip())
    if not match:
        return reply.strip(), []
    raw = match.group(1)
    prefix = reply[: match.start()].strip()
    try:
        parsed = json.loads(raw)
        if not isinstance(parsed, list):
            return prefix, []
        actions: list[dict[str, str]] = []
        for item in parsed:
            if isinstance(item, dict) and item.get("type") in ("open_url", "open_app"):
                t = str(item.get("target", "")).strip()
                if t:
                    actions.append({"type": str(item["type"]), "target": t})
        return prefix, actions
    except json.JSONDecodeError:
        return reply.strip(), []


def _openai_complete(messages: list[dict[str, str]]) -> str:
    from openai import OpenAI

    if not settings.openai_api_key:
        raise ValueError("OPENAI_API_KEY is not set")
    client = OpenAI(api_key=settings.openai_api_key)
    resp = client.chat.completions.create(
        model=settings.openai_model,
        messages=messages,
        temperature=0.4,
    )
    return (resp.choices[0].message.content or "").strip()


def _gemini_complete(messages: list[dict[str, str]]) -> str:
    import google.generativeai as genai

    if not settings.gemini_api_key:
        raise ValueError("GEMINI_API_KEY is not set")
    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel(settings.gemini_model)
    parts: list[str] = []
    for m in messages:
        parts.append(f"{m['role'].upper()}: {m['content']}")
    prompt = "\n\n".join(parts)
    resp = model.generate_content(prompt)
    return (resp.text or "").strip()


def run_assistant(user_text: str, context: str) -> dict[str, Any]:
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT + ("\n\n" + context if context else "")},
        {"role": "user", "content": user_text},
    ]
    provider = settings.ai_provider.lower().strip()
    if provider == "gemini":
        raw = _gemini_complete(messages)
    else:
        raw = _openai_complete(messages)
    reply, action_dicts = _extract_actions(raw)
    actions = [{"type": a["type"], "target": a["target"]} for a in action_dicts]
    return {"reply": reply, "actions": actions}
