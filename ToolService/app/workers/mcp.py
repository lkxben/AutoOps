from pydantic import BaseModel
from typing import Any, Dict, Optional

class MCPRequest(BaseModel):
    tool_name: str
    inputs: Dict[str, Any]
    context: Dict[str, Any]

class MCPResponse(BaseModel):
    output: Dict[str, Any]
    context: Dict[str, Any]