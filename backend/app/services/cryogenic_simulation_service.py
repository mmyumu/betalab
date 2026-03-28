from __future__ import annotations

from math import exp

from app.domain.models import ProduceLot, WorkspaceWidget
from app.services.command_handlers.support import round_volume


class CryogenicSimulationService:
    ambient_temperature_c = 20.0
    dry_ice_temperature_c = -78.5
    dry_ice_latent_heat_kj_per_kg = 571.0
    thawed_apple_specific_heat_kj_per_kg_c = 3.59
    frozen_apple_specific_heat_kj_per_kg_c = 1.88
    apple_water_mass_fraction = 0.84
    water_latent_heat_fusion_kj_per_kg = 333.55
    freeze_start_temperature_c = 0.0
    freeze_end_temperature_c = -2.0
    # heat_transfer_ua_kj_per_s_c = 0.24
    heat_transfer_ua_kj_per_s_c = 1.5
    warming_rate_per_second = 0.014
    ambient_sublimation_g_per_second = 0.04

    def advance_widget(self, widget: WorkspaceWidget, elapsed_seconds: float) -> None:
        total_produce_mass_g = sum(lot.total_mass_g for lot in widget.produce_lots)
        dry_ice = next(
            (liquid for liquid in widget.liquids if liquid.liquid_id == "dry_ice_pellets"),
            None,
        )

        if dry_ice is not None and dry_ice.volume_ml > 0:
            if total_produce_mass_g > 0:
                self._cool_widget_produce(
                    widget=widget,
                    dry_ice_mass_g=dry_ice.volume_ml,
                    elapsed_seconds=elapsed_seconds,
                    total_produce_mass_g=total_produce_mass_g,
                )
                dry_ice.volume_ml = round_volume(
                    max(
                        dry_ice.volume_ml
                        - self._calculate_ambient_sublimation_mass_loss(elapsed_seconds),
                        0.0,
                    )
                )
                return

            dry_ice.volume_ml = round_volume(
                max(
                    dry_ice.volume_ml - self._calculate_ambient_sublimation_mass_loss(elapsed_seconds),
                    0.0,
                )
            )
            return

        self.warm_produce_lots(widget.produce_lots, elapsed_seconds)

    def _cool_widget_produce(
        self,
        *,
        widget: WorkspaceWidget,
        dry_ice_mass_g: float,
        elapsed_seconds: float,
        total_produce_mass_g: float,
    ) -> None:
        contact_factor = min(dry_ice_mass_g / max(total_produce_mass_g, 1.0), 1.0)
        available_thermal_energy_kj = (
            max(dry_ice_mass_g, 0.0) / 1000.0 * self.dry_ice_latent_heat_kj_per_kg
        )
        requested_heat_removal_kj = 0.0
        lot_requests: list[tuple[ProduceLot, float, float]] = []

        for lot in widget.produce_lots:
            current_temperature_c = lot.temperature_c
            temperature_gap_c = max(current_temperature_c - self.dry_ice_temperature_c, 0.0)
            if temperature_gap_c <= 0:
                lot_requests.append((lot, 0.0, current_temperature_c))
                continue

            mass_fraction = lot.total_mass_g / max(total_produce_mass_g, 1.0)
            thermal_mass_kg = max(lot.total_mass_g, 0.0) / 1000.0
            if thermal_mass_kg <= 0:
                lot_requests.append((lot, 0.0, current_temperature_c))
                continue

            effective_cp = self._get_effective_specific_heat(current_temperature_c)
            cooling_rate = (
                self.heat_transfer_ua_kj_per_s_c
                * contact_factor
                * mass_fraction
                / max(thermal_mass_kg * effective_cp, 1e-9)
            )
            candidate_temperature_c = self.dry_ice_temperature_c + (
                current_temperature_c - self.dry_ice_temperature_c
            ) * exp(-cooling_rate * elapsed_seconds)
            lot_heat_request_kj = thermal_mass_kg * max(
                self._get_specific_enthalpy(current_temperature_c)
                - self._get_specific_enthalpy(candidate_temperature_c),
                0.0,
            )
            lot_requests.append((lot, lot_heat_request_kj, candidate_temperature_c))
            requested_heat_removal_kj += lot_heat_request_kj

        usable_heat_removal_kj = min(requested_heat_removal_kj, available_thermal_energy_kj)
        scaling_factor = (
            usable_heat_removal_kj / requested_heat_removal_kj if requested_heat_removal_kj > 0 else 0.0
        )

        for lot, requested_heat_kj, candidate_temperature_c in lot_requests:
            actual_heat_kj = requested_heat_kj * scaling_factor
            if actual_heat_kj <= 0:
                continue

            thermal_mass_kg = max(lot.total_mass_g, 0.0) / 1000.0
            if thermal_mass_kg <= 0:
                continue

            if scaling_factor >= 0.999:
                lot.temperature_c = max(candidate_temperature_c, self.dry_ice_temperature_c)
                continue

            current_enthalpy = self._get_specific_enthalpy(lot.temperature_c)
            next_enthalpy = current_enthalpy - (actual_heat_kj / thermal_mass_kg)
            lot.temperature_c = self._get_temperature_from_specific_enthalpy(next_enthalpy)

        thermal_mass_loss_g = usable_heat_removal_kj / self.dry_ice_latent_heat_kj_per_kg * 1000.0
        dry_ice = next((liquid for liquid in widget.liquids if liquid.liquid_id == "dry_ice_pellets"), None)
        if dry_ice is not None:
            dry_ice.volume_ml = round_volume(max(dry_ice.volume_ml - thermal_mass_loss_g, 0.0))

    def warm_produce_lots(self, produce_lots: list[ProduceLot], elapsed_seconds: float) -> None:
        for lot in produce_lots:
            warming_progress = min(self.warming_rate_per_second * elapsed_seconds, 0.95)
            lot.temperature_c = min(
                lot.temperature_c
                + ((self.ambient_temperature_c - lot.temperature_c) * warming_progress),
                self.ambient_temperature_c,
            )

    def _calculate_ambient_sublimation_mass_loss(self, elapsed_seconds: float) -> float:
        return self.ambient_sublimation_g_per_second * elapsed_seconds

    def _get_effective_specific_heat(self, temperature_c: float) -> float:
        if temperature_c >= self.freeze_start_temperature_c:
            return self.thawed_apple_specific_heat_kj_per_kg_c

        if temperature_c <= self.freeze_end_temperature_c:
            return self.frozen_apple_specific_heat_kj_per_kg_c

        phase_band_width_c = self.freeze_start_temperature_c - self.freeze_end_temperature_c
        latent_component = (
            self.apple_water_mass_fraction * self.water_latent_heat_fusion_kj_per_kg
        ) / phase_band_width_c
        sensible_component = (
            self.thawed_apple_specific_heat_kj_per_kg_c + self.frozen_apple_specific_heat_kj_per_kg_c
        ) / 2.0
        return latent_component + sensible_component

    def _get_specific_enthalpy(self, temperature_c: float) -> float:
        frozen_band_span_c = self.freeze_end_temperature_c - self.dry_ice_temperature_c
        frozen_enthalpy_at_phase_start = (
            self.frozen_apple_specific_heat_kj_per_kg_c * frozen_band_span_c
        )
        latent_enthalpy = self.apple_water_mass_fraction * self.water_latent_heat_fusion_kj_per_kg

        if temperature_c <= self.freeze_end_temperature_c:
            return self.frozen_apple_specific_heat_kj_per_kg_c * (
                temperature_c - self.dry_ice_temperature_c
            )

        if temperature_c <= self.freeze_start_temperature_c:
            phase_progress = (
                temperature_c - self.freeze_end_temperature_c
            ) / (self.freeze_start_temperature_c - self.freeze_end_temperature_c)
            return frozen_enthalpy_at_phase_start + (phase_progress * latent_enthalpy)

        return (
            frozen_enthalpy_at_phase_start
            + latent_enthalpy
            + (temperature_c - self.freeze_start_temperature_c) * self.thawed_apple_specific_heat_kj_per_kg_c
        )

    def _get_temperature_from_specific_enthalpy(self, specific_enthalpy_kj_per_kg: float) -> float:
        frozen_band_span_c = self.freeze_end_temperature_c - self.dry_ice_temperature_c
        frozen_enthalpy_at_phase_start = (
            self.frozen_apple_specific_heat_kj_per_kg_c * frozen_band_span_c
        )
        latent_enthalpy = self.apple_water_mass_fraction * self.water_latent_heat_fusion_kj_per_kg
        thawed_enthalpy_at_zero = frozen_enthalpy_at_phase_start + latent_enthalpy

        if specific_enthalpy_kj_per_kg <= frozen_enthalpy_at_phase_start:
            return self.dry_ice_temperature_c + (
                specific_enthalpy_kj_per_kg / self.frozen_apple_specific_heat_kj_per_kg_c
            )

        if specific_enthalpy_kj_per_kg <= thawed_enthalpy_at_zero:
            phase_progress = (
                specific_enthalpy_kj_per_kg - frozen_enthalpy_at_phase_start
            ) / latent_enthalpy
            return self.freeze_end_temperature_c + (
                phase_progress * (self.freeze_start_temperature_c - self.freeze_end_temperature_c)
            )

        return self.freeze_start_temperature_c + (
            (specific_enthalpy_kj_per_kg - thawed_enthalpy_at_zero)
            / self.thawed_apple_specific_heat_kj_per_kg_c
        )
