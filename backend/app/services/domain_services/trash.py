from __future__ import annotations

from dataclasses import dataclass

from app.domain.models import Experiment, TrashToolEntry, new_id
from app.services.domain_services.base import ExperimentRuntime, WriteDomainService


@dataclass(frozen=True, slots=True)
class EmptyTrashRequest:
    pass


@dataclass(frozen=True, slots=True)
class DiscardBasketToolRequest:
    tool_id: str


class DiscardBasketToolService(WriteDomainService[DiscardBasketToolRequest]):
    def __init__(self, runtime: ExperimentRuntime) -> None:
        super().__init__(runtime)

    def _run(self, experiment: Experiment, request: DiscardBasketToolRequest) -> None:
        tool_index = next(
            (i for i, t in enumerate(experiment.basket_tools) if t.id == request.tool_id),
            None,
        )
        if tool_index is None:
            raise ValueError("The specified bag is not in the produce basket.")

        discarded_tool = experiment.basket_tools.pop(tool_index)
        experiment.trash.tools.append(
            TrashToolEntry(
                id=new_id("trash_tool"),
                origin_label="Produce basket",
                tool=discarded_tool,
            )
        )
        experiment.audit_log.append(f"{discarded_tool.label} discarded from Produce basket.")
