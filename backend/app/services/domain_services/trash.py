from __future__ import annotations

from dataclasses import dataclass

from app.domain.models import Experiment, TrashToolEntry, new_id
from app.services.domain_services.base import ExperimentRuntime, WriteDomainService


@dataclass(frozen=True, slots=True)
class EmptyTrashRequest:
    pass


class DiscardBasketToolService(WriteDomainService[EmptyTrashRequest]):
    def __init__(self, runtime: ExperimentRuntime) -> None:
        super().__init__(runtime)

    def _run(self, experiment: Experiment, request: EmptyTrashRequest) -> None:
        if experiment.basket_tool is None:
            raise ValueError("Place a received sampling bag in the basket before discarding it.")

        discarded_tool = experiment.basket_tool
        experiment.basket_tool = None
        experiment.trash.tools.append(
            TrashToolEntry(
                id=new_id("trash_tool"),
                origin_label="Produce basket",
                tool=discarded_tool,
            )
        )
        experiment.audit_log.append(f"{discarded_tool.label} discarded from Produce basket.")
