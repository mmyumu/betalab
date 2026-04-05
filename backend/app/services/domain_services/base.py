from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Generic, Protocol, TypeVar

from app.domain.models import Experiment
from app.schemas.experiment import ExperimentSchema

ArgumentT = TypeVar("ArgumentT")


class ExperimentRuntime(Protocol):
    def _require_experiment(self, experiment_id: str) -> Experiment: ...

    def _advance_experiment_to_now(self, experiment: Experiment) -> bool: ...

    def _persist_mutation_and_to_schema(self, experiment: Experiment) -> ExperimentSchema: ...

    def _to_schema(self, experiment: Experiment) -> ExperimentSchema: ...


class ExperimentServiceBase(ABC, Generic[ArgumentT]):
    def __init__(self, runtime: ExperimentRuntime) -> None:
        self._runtime = runtime


class ExperimentWriteService(ExperimentServiceBase[ArgumentT], ABC):
    def run(self, experiment_id: str, arguments: ArgumentT) -> ExperimentSchema:
        experiment = self._runtime._require_experiment(experiment_id)
        self._runtime._advance_experiment_to_now(experiment)
        self._run(experiment, arguments)
        return self._runtime._persist_mutation_and_to_schema(experiment)

    @abstractmethod
    def _run(self, experiment: Experiment, arguments: ArgumentT) -> None: ...


class ExperimentReadService(ExperimentServiceBase[ArgumentT], ABC):
    def run(self, experiment_id: str, arguments: ArgumentT) -> ExperimentSchema:
        experiment = self._runtime._require_experiment(experiment_id)
        did_advance = self._runtime._advance_experiment_to_now(experiment)
        self._run(experiment, arguments)
        if did_advance:
            return self._runtime._persist_mutation_and_to_schema(experiment)
        return self._runtime._to_schema(experiment)

    @abstractmethod
    def _run(self, experiment: Experiment, arguments: ArgumentT) -> None: ...
