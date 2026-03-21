from __future__ import annotations

from math import exp

from app.domain.models import ChromatogramPoint, Molecule, Transition, TransitionResult


def gaussian_peak(
    center: float,
    height: float,
    width: float,
    start: float = 0.0,
    stop: float = 3.0,
    step: float = 0.1,
) -> list[ChromatogramPoint]:
    points: list[ChromatogramPoint] = []
    current = start
    while current <= stop + 1e-9:
        delta = (current - center) / width
        intensity = height * exp(-0.5 * delta * delta)
        points.append(ChromatogramPoint(time_min=round(current, 3), intensity=round(intensity, 3)))
        current += step
    return points


def simulate_transition_result(
    molecule: Molecule,
    transition: Transition,
    concentration_ng_ml: float,
    matrix_effect_factor: float,
) -> TransitionResult:
    effective_height = (
        concentration_ng_ml
        * molecule.response_factor
        * transition.relative_response
        * matrix_effect_factor
    )
    chromatogram_points = gaussian_peak(
        center=molecule.retention_time_min,
        height=effective_height,
        width=0.12,
    )
    area = sum(point.intensity for point in chromatogram_points) * 0.1
    return TransitionResult(
        transition_id=transition.id,
        area=round(area, 3),
        height=round(effective_height, 3),
        chromatogram_points=chromatogram_points,
    )
