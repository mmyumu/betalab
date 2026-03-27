from __future__ import annotations


def can_tool_accept_liquids(tool_type: str) -> bool:
    return tool_type not in {"sample_bag", "cutting_board"}


def can_tool_accept_produce(tool_type: str) -> bool:
    return tool_type in {"sample_bag", "cutting_board"}


def is_workspace_widget_discardable(widget_id: str) -> bool:
    return widget_id in {"rack", "instrument", "grinder"}
