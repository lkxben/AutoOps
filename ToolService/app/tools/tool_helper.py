import inspect

def build_tool_registry(functions: list[callable]) -> dict:
    registry = {}

    for fn in functions:
        sig = inspect.signature(fn)
        registry[fn.__name__] = {
            "inputs": list(sig.parameters.keys()),
            "description": inspect.getdoc(fn) or ""
        }

    return registry