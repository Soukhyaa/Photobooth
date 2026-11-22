import hashlib
import uuid
from typing import Optional
from fastapi import Header, HTTPException, status


def get_client_token_hash(
    x_client_token: Optional[str] = Header(
        None,
        alias="X-Client-Token",
        description="Anonymous client UUID identifying the browser installation.",
    ),
) -> str:
    """
    Validate that X-Client-Token is provided and is a valid UUID, then hash it via SHA-256.
    The raw token is never persisted or logged.
    """
    if not x_client_token or not x_client_token.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required X-Client-Token header.",
        )

    try:
        parsed_uuid = uuid.UUID(str(x_client_token).strip())
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid X-Client-Token: must be a valid UUID.",
        )

    return hashlib.sha256(str(parsed_uuid).encode("utf-8")).hexdigest()
