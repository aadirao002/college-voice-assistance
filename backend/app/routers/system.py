import logging
import subprocess
from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException

from app.schemas import OpenAppRequest

router = APIRouter(prefix="/system", tags=["system"])
log = logging.getLogger(__name__)

ALLOWED_APPS = {
    "notepad": "notepad",
    "calculator": "calc",
    "chrome": "chrome",
    "edge": "msedge",
    "vscode": "code",
    "explorer": "explorer",
}


@router.post("/open-app")
def open_app(payload: OpenAppRequest):
    key = payload.app.strip().lower()
    if key not in ALLOWED_APPS:
        raise HTTPException(
            status_code=400,
            detail=f"App not allowed. Use one of: {', '.join(sorted(ALLOWED_APPS))}",
        )
    exe = ALLOWED_APPS[key]
    try:
        # Windows: `start` with empty window title handles registered apps
        subprocess.Popen(
            ["cmd", "/c", "start", "", exe],
            shell=False,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except OSError as e:
        log.warning("open-app failed: %s", e)
        raise HTTPException(status_code=500, detail="Could not launch app") from e
    return {"ok": True, "launched": exe}


@router.get("/open-url")
def validate_open_url(url: str):
    if not url.startswith(("https://", "http://")):
        raise HTTPException(status_code=400, detail="Only http(s) URLs are allowed")
    parsed = urlparse(url)
    if not parsed.netloc:
        raise HTTPException(status_code=400, detail="Invalid URL")
    return {"ok": True, "url": url}
