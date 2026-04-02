from __future__ import annotations

from dataclasses import dataclass
import random

from app.domain.models import ProduceLot, WorkbenchTool, new_id

SAMPLE_BAG_TARE_MASS_G = 36.0
DEFAULT_ORCHARD_NAME = "Martin Orchard"
DEFAULT_HARVEST_DATE = "2026-03-29"

_THEORETICAL_LOT_MASS_WEIGHTS_G: tuple[tuple[float, float], ...] = (
    (2000.0, 0.22),
    (2500.0, 0.34),
    (3000.0, 0.2),
    (4000.0, 0.12),
    (5000.0, 0.06),
    (1500.0, 0.06),
)


@dataclass(frozen=True)
class ReceivedAppleSampleSpec:
    orchard_name: str
    harvest_date: str
    theoretical_mass_g: float
    actual_mass_g: float
    unit_count: int

    @property
    def field_label_text(self) -> str:
        return (
            f"{self.orchard_name} • Harvest {self.harvest_date} • "
            f"Approx. {self.theoretical_mass_g / 1000:.2f} kg"
        )

    @property
    def gross_mass_g(self) -> float:
        return round(self.actual_mass_g + SAMPLE_BAG_TARE_MASS_G, 1)


def generate_received_apple_sample_spec(rng: random.Random | None = None) -> ReceivedAppleSampleSpec:
    rng = rng or random.Random()
    theoretical_mass_g = rng.choices(
        [mass for mass, _weight in _THEORETICAL_LOT_MASS_WEIGHTS_G],
        weights=[weight for _mass, weight in _THEORETICAL_LOT_MASS_WEIGHTS_G],
        k=1,
    )[0]
    deviation_limit_g = max(45.0, theoretical_mass_g * 0.045)
    deviation_g = rng.gauss(0.0, theoretical_mass_g * 0.012)
    deviation_g = max(min(deviation_g, deviation_limit_g), -deviation_limit_g)
    actual_mass_g = round(max(theoretical_mass_g + deviation_g, 1000.0), 1)
    unit_count = max(8, int(round(actual_mass_g / 205.0)))

    return ReceivedAppleSampleSpec(
        orchard_name=DEFAULT_ORCHARD_NAME,
        harvest_date=DEFAULT_HARVEST_DATE,
        theoretical_mass_g=theoretical_mass_g,
        actual_mass_g=actual_mass_g,
        unit_count=unit_count,
    )


def build_received_sampling_bag(label: str = "Sealed sampling bag") -> WorkbenchTool:
    sample_spec = generate_received_apple_sample_spec()
    produce_lot = ProduceLot(
        id=new_id("produce"),
        label="Orchard apple lot",
        produce_type="apple",
        total_mass_g=sample_spec.actual_mass_g,
        unit_count=sample_spec.unit_count,
    )
    return WorkbenchTool(
        id=new_id("bench_tool"),
        tool_id="sealed_sampling_bag",
        label=label,
        subtitle="Field reception",
        accent="emerald",
        tool_type="sample_bag",
        capacity_ml=500.0,
        is_sealed=True,
        field_label_text=sample_spec.field_label_text,
        produce_lots=[produce_lot],
    )


def resolve_received_bag_gross_mass_g(received_bag: WorkbenchTool | None) -> float | None:
    if received_bag is None or received_bag.tool_type != "sample_bag":
        return None

    produce_mass_g = sum(produce_lot.total_mass_g for produce_lot in received_bag.produce_lots)
    return round(produce_mass_g + SAMPLE_BAG_TARE_MASS_G, 1)
