from __future__ import annotations

from collections.abc import Iterable

from app.domain.models import (
    Experiment,
    ProduceFraction,
    ProduceLot,
    ProduceMaterialState,
    SpatulaState,
    TrashProduceLotEntry,
    WorkbenchTool,
    WorkspaceWidget,
    new_id,
)

GROUND_POWDER_APPARENT_DENSITY_G_PER_ML = 0.5


def sync_canonical_produce_model(experiment: Experiment) -> None:
    produce_lots_by_id = _collect_produce_lots(experiment)
    state_ids_by_signature: dict[tuple[object, ...], str] = {}
    material_states: list[ProduceMaterialState] = []
    existing_states_by_id = {state.id: state for state in experiment.produce_material_states}
    existing_state_ids_by_signature = {
        (
            state.produce_lot_id,
            state.cut_state,
            state.temperature_c,
            state.grind_quality_label,
            state.homogeneity_score,
            state.residual_co2_mass_g,
            state.grinding_elapsed_seconds,
            state.grinding_temperature_integral,
        ): state.id
        for state in experiment.produce_material_states
    }
    material_state_ids_added: set[str] = set()

    def register_material_state(state_id: str) -> None:
        if state_id in material_state_ids_added:
            return
        existing_state = existing_states_by_id.get(state_id)
        if existing_state is None:
            return
        material_states.append(existing_state)
        material_state_ids_added.add(state_id)

    def ensure_material_state_id(produce_lot: ProduceLot, *, force_ground: bool = False) -> str:
        signature = (
            produce_lot.id,
            "ground" if force_ground else produce_lot.cut_state,
            produce_lot.temperature_c,
            produce_lot.grind_quality_label,
            produce_lot.homogeneity_score,
            produce_lot.residual_co2_mass_g,
            produce_lot.grinding_elapsed_seconds,
            produce_lot.grinding_temperature_integral,
        )
        existing_id = state_ids_by_signature.get(signature)
        if existing_id is not None:
            return existing_id
        existing_id = existing_state_ids_by_signature.get(signature)
        if existing_id is not None:
            state_ids_by_signature[signature] = existing_id
            register_material_state(existing_id)
            return existing_id

        state_id = new_id("produce_material_state")
        state_ids_by_signature[signature] = state_id
        material_states.append(
            ProduceMaterialState(
                id=state_id,
                produce_lot_id=produce_lot.id,
                cut_state="ground" if force_ground else produce_lot.cut_state,
                temperature_c=produce_lot.temperature_c,
                grind_quality_label=produce_lot.grind_quality_label,
                homogeneity_score=produce_lot.homogeneity_score,
                residual_co2_mass_g=produce_lot.residual_co2_mass_g,
                grinding_elapsed_seconds=produce_lot.grinding_elapsed_seconds,
                grinding_temperature_integral=produce_lot.grinding_temperature_integral,
            )
        )
        material_state_ids_added.add(state_id)
        return state_id

    for basket_tool in experiment.basket_tools:
        basket_tool.produce_fractions = _build_tool_produce_fractions(
            basket_tool.produce_lots,
            ensure_material_state_id,
            location_kind="basket_tool",
            location_id=basket_tool.id,
            container_id=basket_tool.id,
            container_label=basket_tool.label,
            contact_impurity_mg_per_g=basket_tool.contact_impurity_mg_per_g,
        )

    experiment.spatula.produce_fractions = _select_canonical_powder_fractions(
        existing_fractions=experiment.spatula.produce_fractions,
        existing_states_by_id=existing_states_by_id,
        produce_lots_by_id=produce_lots_by_id,
        ensure_material_state_id=ensure_material_state_id,
        location_kind="spatula",
        location_id="spatula",
        container_id="spatula",
        container_label="Spatula",
    )

    for slot in experiment.workbench.slots:
        slot.surface_produce_fractions = _build_surface_produce_fractions(
            slot.surface_produce_lots,
            ensure_material_state_id,
            location_kind="workbench_surface",
            location_id=slot.id,
            container_label=slot.label,
        )
        if slot.tool is None:
            continue
        existing_tool_fractions = list(slot.tool.produce_fractions)
        canonical_powder_fractions = _select_canonical_powder_fractions(
            existing_fractions=existing_tool_fractions,
            existing_states_by_id=existing_states_by_id,
            produce_lots_by_id=produce_lots_by_id,
            ensure_material_state_id=ensure_material_state_id,
            location_kind="workbench_tool",
            location_id=slot.id,
            container_id=slot.tool.id,
            container_label=slot.tool.label,
        )
        powder_source_ids = {fraction.produce_lot_id for fraction in canonical_powder_fractions}
        slot.tool.produce_fractions = _build_tool_produce_fractions(
            [produce_lot for produce_lot in slot.tool.produce_lots if produce_lot.cut_state != "ground" or produce_lot.id not in powder_source_ids],
            ensure_material_state_id,
            location_kind="workbench_tool",
            location_id=slot.id,
            container_id=slot.tool.id,
            container_label=slot.tool.label,
            contact_impurity_mg_per_g=slot.tool.contact_impurity_mg_per_g,
        )
        slot.tool.produce_fractions.extend(canonical_powder_fractions)

    for slot in experiment.rack.slots:
        if slot.tool is None:
            continue
        existing_tool_fractions = list(slot.tool.produce_fractions)
        canonical_powder_fractions = _select_canonical_powder_fractions(
            existing_fractions=existing_tool_fractions,
            existing_states_by_id=existing_states_by_id,
            produce_lots_by_id=produce_lots_by_id,
            ensure_material_state_id=ensure_material_state_id,
            location_kind="rack_tool",
            location_id=slot.id,
            container_id=slot.tool.id,
            container_label=slot.tool.label,
        )
        powder_source_ids = {fraction.produce_lot_id for fraction in canonical_powder_fractions}
        slot.tool.produce_fractions = _build_tool_produce_fractions(
            [produce_lot for produce_lot in slot.tool.produce_lots if produce_lot.cut_state != "ground" or produce_lot.id not in powder_source_ids],
            ensure_material_state_id,
            location_kind="rack_tool",
            location_id=slot.id,
            container_id=slot.tool.id,
            container_label=slot.tool.label,
            contact_impurity_mg_per_g=slot.tool.contact_impurity_mg_per_g,
        )
        slot.tool.produce_fractions.extend(canonical_powder_fractions)

    for widget in experiment.workspace.widgets:
        widget.produce_fractions = _build_tool_produce_fractions(
            widget.produce_lots,
            ensure_material_state_id,
            location_kind="workspace_widget",
            location_id=widget.id,
            container_id=widget.tool.id if widget.tool is not None else None,
            container_label=widget.label,
            contact_impurity_mg_per_g=widget.tool.contact_impurity_mg_per_g if widget.tool is not None else 0.0,
        )
        if widget.tool is not None:
            existing_tool_fractions = list(widget.tool.produce_fractions)
            canonical_powder_fractions = _select_canonical_powder_fractions(
                existing_fractions=existing_tool_fractions,
                existing_states_by_id=existing_states_by_id,
                produce_lots_by_id=produce_lots_by_id,
                ensure_material_state_id=ensure_material_state_id,
                location_kind="workspace_widget_tool",
                location_id=widget.id,
                container_id=widget.tool.id,
                container_label=widget.tool.label,
            )
            powder_source_ids = {fraction.produce_lot_id for fraction in canonical_powder_fractions}
            widget.tool.produce_fractions = _build_tool_produce_fractions(
                [
                    produce_lot
                    for produce_lot in widget.tool.produce_lots
                    if produce_lot.cut_state != "ground" or produce_lot.id not in powder_source_ids
                ],
                ensure_material_state_id,
                location_kind="workspace_widget_tool",
                location_id=widget.id,
                container_id=widget.tool.id,
                container_label=widget.tool.label,
                contact_impurity_mg_per_g=widget.tool.contact_impurity_mg_per_g,
            )
            widget.tool.produce_fractions.extend(canonical_powder_fractions)

    experiment.workspace.produce_basket_fractions = _build_surface_produce_fractions(
        experiment.workspace.produce_basket_lots,
        ensure_material_state_id,
        location_kind="produce_basket",
        location_id="basket",
        container_label="Produce basket",
    )

    for entry in experiment.trash.produce_lots:
        entry.produce_fraction = _build_trash_produce_fraction(entry, ensure_material_state_id)

    experiment.produce_material_states = material_states


def _collect_produce_lots(experiment: Experiment) -> dict[str, ProduceLot]:
    produce_lots: dict[str, ProduceLot] = {}

    def add(entries: Iterable[ProduceLot]) -> None:
        for produce_lot in entries:
            produce_lots.setdefault(produce_lot.id, produce_lot)

    for basket_tool in experiment.basket_tools:
        add(basket_tool.produce_lots)
    add(experiment.workspace.produce_basket_lots)
    for slot in experiment.workbench.slots:
        add(slot.surface_produce_lots)
        if slot.tool is not None:
            add(slot.tool.produce_lots)
    for slot in experiment.rack.slots:
        if slot.tool is not None:
            add(slot.tool.produce_lots)
    for widget in experiment.workspace.widgets:
        add(widget.produce_lots)
        if widget.tool is not None:
            add(widget.tool.produce_lots)
    add(entry.produce_lot for entry in experiment.trash.produce_lots)
    return produce_lots


def _build_tool_produce_fractions(
    produce_lots: list[ProduceLot],
    ensure_material_state_id,
    *,
    location_kind: str,
    location_id: str,
    container_id: str | None,
    container_label: str | None,
    contact_impurity_mg_per_g: float = 0.0,
) -> list[ProduceFraction]:
    return [
        ProduceFraction(
            id=f"produce_fraction_{produce_lot.id}_{location_id}",
            produce_lot_id=produce_lot.id,
            produce_material_state_id=ensure_material_state_id(produce_lot),
            mass_g=produce_lot.total_mass_g,
            unit_count=produce_lot.unit_count,
            is_contaminated=produce_lot.is_contaminated,
            impurity_mass_mg=(round(produce_lot.total_mass_g * contact_impurity_mg_per_g, 6) if produce_lot.cut_state == "ground" else 0.0),
            exposure_container_ids=[container_id] if produce_lot.cut_state == "ground" and container_id is not None else [],
            location_kind=location_kind,
            location_id=location_id,
            container_id=container_id,
            container_label=container_label,
        )
        for produce_lot in produce_lots
    ]


def _build_surface_produce_fractions(
    produce_lots: list[ProduceLot],
    ensure_material_state_id,
    *,
    location_kind: str,
    location_id: str,
    container_label: str | None,
) -> list[ProduceFraction]:
    return [
        ProduceFraction(
            id=f"produce_fraction_{produce_lot.id}_{location_id}",
            produce_lot_id=produce_lot.id,
            produce_material_state_id=ensure_material_state_id(produce_lot),
            mass_g=produce_lot.total_mass_g,
            unit_count=produce_lot.unit_count,
            is_contaminated=produce_lot.is_contaminated,
            location_kind=location_kind,
            location_id=location_id,
            container_label=container_label,
        )
        for produce_lot in produce_lots
    ]


def _build_trash_produce_fraction(entry: TrashProduceLotEntry, ensure_material_state_id) -> ProduceFraction:
    return ProduceFraction(
        id=f"produce_fraction_{entry.produce_lot.id}_{entry.id}",
        produce_lot_id=entry.produce_lot.id,
        produce_material_state_id=ensure_material_state_id(entry.produce_lot),
        mass_g=entry.produce_lot.total_mass_g,
        unit_count=entry.produce_lot.unit_count,
        is_contaminated=entry.produce_lot.is_contaminated,
        location_kind="trash",
        location_id=entry.id,
        container_label=entry.origin_label,
    )


def _select_canonical_powder_fractions(
    *,
    existing_fractions: list[ProduceFraction],
    existing_states_by_id: dict[str, ProduceMaterialState],
    produce_lots_by_id: dict[str, ProduceLot],
    ensure_material_state_id,
    location_kind: str,
    location_id: str,
    container_id: str | None,
    container_label: str | None,
) -> list[ProduceFraction]:
    canonical_ground = [
        _normalize_existing_powder_fraction(
            fraction,
            existing_states_by_id=existing_states_by_id,
            produce_lots_by_id=produce_lots_by_id,
            ensure_material_state_id=ensure_material_state_id,
            location_kind=location_kind,
            location_id=location_id,
            container_id=container_id,
            container_label=container_label,
        )
        for fraction in existing_fractions
        if _is_ground_fraction(
            fraction,
            existing_states_by_id=existing_states_by_id,
            produce_lots_by_id=produce_lots_by_id,
        )
    ]
    return canonical_ground


def _is_ground_fraction(
    fraction: ProduceFraction,
    *,
    existing_states_by_id: dict[str, ProduceMaterialState],
    produce_lots_by_id: dict[str, ProduceLot],
) -> bool:
    existing_state = existing_states_by_id.get(fraction.produce_material_state_id)
    if existing_state is not None:
        return existing_state.cut_state == "ground"
    produce_lot = produce_lots_by_id.get(fraction.produce_lot_id)
    return produce_lot is not None and produce_lot.cut_state == "ground"


def _normalize_existing_powder_fraction(
    fraction: ProduceFraction,
    *,
    existing_states_by_id: dict[str, ProduceMaterialState],
    produce_lots_by_id: dict[str, ProduceLot],
    ensure_material_state_id,
    location_kind: str,
    location_id: str,
    container_id: str | None,
    container_label: str | None,
) -> ProduceFraction:
    produce_lot = produce_lots_by_id.get(fraction.produce_lot_id)
    if produce_lot is None:
        produce_lot = ProduceLot(
            id=fraction.produce_lot_id,
            label=fraction.produce_lot_id,
            produce_type="apple",
            total_mass_g=fraction.mass_g,
            cut_state="ground",
        )

    existing_state = existing_states_by_id.get(fraction.produce_material_state_id)
    return ProduceFraction(
        id=fraction.id,
        produce_lot_id=fraction.produce_lot_id,
        produce_material_state_id=ensure_material_state_id(
            produce_lot,
            force_ground=(existing_state is None or existing_state.cut_state == "ground"),
        ),
        mass_g=fraction.mass_g,
        unit_count=fraction.unit_count,
        is_contaminated=fraction.is_contaminated,
        impurity_mass_mg=fraction.impurity_mass_mg,
        exposure_container_ids=list(fraction.exposure_container_ids),
        location_kind=location_kind,
        location_id=location_id,
        container_id=container_id,
        container_label=container_label,
    )


def get_total_mass_g_from_fractions(
    fractions: list[ProduceFraction],
    *,
    fallback_produce_lots: list[ProduceLot] | None = None,
) -> float:
    if fractions:
        return sum(max(fraction.mass_g, 0.0) for fraction in fractions)
    if fallback_produce_lots is None:
        return 0.0
    lot_mass_g = sum(max(produce_lot.total_mass_g, 0.0) for produce_lot in fallback_produce_lots)
    if lot_mass_g > 0:
        return lot_mass_g
    return 0.0


def get_tool_total_produce_mass_g(tool: WorkbenchTool) -> float:
    return get_total_mass_g_from_fractions(
        tool.produce_fractions,
        fallback_produce_lots=tool.produce_lots,
    )


def get_widget_total_produce_mass_g(widget: WorkspaceWidget) -> float:
    return get_total_mass_g_from_fractions(widget.produce_fractions, fallback_produce_lots=widget.produce_lots)


def get_tool_total_powder_mass_g(
    tool: WorkbenchTool,
    *,
    material_states: list[ProduceMaterialState] | None = None,
) -> float:
    if not tool.produce_fractions or not material_states:
        return 0.0
    states_by_id = {state.id: state for state in material_states}
    return sum(
        max(fraction.mass_g, 0.0)
        for fraction in tool.produce_fractions
        if states_by_id.get(fraction.produce_material_state_id) is not None and states_by_id[fraction.produce_material_state_id].cut_state == "ground"
    )


def get_tool_total_powder_volume_ml(
    tool: WorkbenchTool,
    *,
    material_states: list[ProduceMaterialState] | None = None,
) -> float:
    total_powder_g = get_tool_total_powder_mass_g(tool, material_states=material_states)
    return round(total_powder_g / GROUND_POWDER_APPARENT_DENSITY_G_PER_ML, 3)


def get_tool_remaining_fill_capacity_ml(
    tool: WorkbenchTool,
    *,
    material_states: list[ProduceMaterialState] | None = None,
    excluded_liquid_id: str | None = None,
) -> float:
    powder_volume_ml = get_tool_total_powder_volume_ml(tool, material_states=material_states)
    liquid_volume_ml = sum(
        max(liquid.volume_ml, 0.0) for liquid in tool.liquids if liquid.id != excluded_liquid_id
    )
    return round(max(tool.capacity_ml - powder_volume_ml - liquid_volume_ml, 0.0), 3)


def get_spatula_total_produce_mass_g(spatula: SpatulaState) -> float:
    return sum(max(fraction.mass_g, 0.0) for fraction in spatula.produce_fractions)


def split_tool_powder_into_spatula(
    tool: WorkbenchTool,
    spatula: SpatulaState,
    *,
    loaded_mass_g: float,
    material_states: list[ProduceMaterialState],
) -> None:
    total_powder_g = get_tool_total_powder_mass_g(tool, material_states=material_states)
    if total_powder_g <= 0 or loaded_mass_g <= 0:
        spatula.is_loaded = False
        spatula.produce_fractions = []
        spatula.source_tool_id = None
        return

    take_ratio = min(max(loaded_mass_g / total_powder_g, 0.0), 1.0)
    states_by_id = {state.id: state for state in material_states}
    loaded_fractions: list[ProduceFraction] = []
    for fraction in tool.produce_fractions:
        state = states_by_id.get(fraction.produce_material_state_id)
        if state is None or state.cut_state != "ground":
            continue
        extracted_fraction = _split_produce_fraction(
            fraction,
            take_ratio,
            location_kind="spatula",
            location_id="spatula",
            container_id="spatula",
            container_label="Spatula",
        )
        if extracted_fraction is not None:
            loaded_fractions.append(extracted_fraction)
    tool.produce_fractions = [fraction for fraction in tool.produce_fractions if fraction.mass_g > 0]
    spatula.is_loaded = bool(loaded_fractions)
    spatula.produce_fractions = loaded_fractions
    spatula.source_tool_id = tool.id if loaded_fractions else None


def pour_spatula_into_tool(
    spatula: SpatulaState,
    tool: WorkbenchTool,
    *,
    transferred_mass_g: float,
    material_states: list[ProduceMaterialState],
    location_kind: str,
    location_id: str,
) -> None:
    total_loaded_g = get_spatula_total_produce_mass_g(spatula)
    if total_loaded_g <= 0 or transferred_mass_g <= 0:
        return

    transfer_ratio = min(max(transferred_mass_g / total_loaded_g, 0.0), 1.0)
    _pour_produce_fractions_proportional(
        spatula.produce_fractions,
        tool.produce_fractions,
        transfer_ratio,
        tool,
        location_kind=location_kind,
        location_id=location_id,
    )
    spatula.produce_fractions = [fraction for fraction in spatula.produce_fractions if fraction.mass_g > 0]
    spatula.is_loaded = bool(spatula.produce_fractions)
    if not spatula.is_loaded:
        spatula.source_tool_id = None


def _split_produce_fraction(
    fraction: ProduceFraction,
    ratio: float,
    *,
    location_kind: str,
    location_id: str,
    container_id: str | None,
    container_label: str | None,
) -> ProduceFraction | None:
    taken_mass_g = round(fraction.mass_g * ratio, 3)
    if taken_mass_g <= 0:
        return None

    taken_impurity_mg = round(fraction.impurity_mass_mg * ratio, 6)
    fraction.mass_g = round(max(fraction.mass_g - taken_mass_g, 0.0), 3)
    fraction.impurity_mass_mg = round(max(fraction.impurity_mass_mg - taken_impurity_mg, 0.0), 6)
    return ProduceFraction(
        id=new_id("produce_fraction"),
        produce_lot_id=fraction.produce_lot_id,
        produce_material_state_id=fraction.produce_material_state_id,
        mass_g=taken_mass_g,
        unit_count=fraction.unit_count,
        is_contaminated=fraction.is_contaminated,
        impurity_mass_mg=taken_impurity_mg,
        exposure_container_ids=list(fraction.exposure_container_ids),
        location_kind=location_kind,
        location_id=location_id,
        container_id=container_id,
        container_label=container_label,
    )


def _pour_produce_fractions_proportional(
    source: list[ProduceFraction],
    dest: list[ProduceFraction],
    ratio: float,
    target_tool: WorkbenchTool,
    *,
    location_kind: str,
    location_id: str,
) -> None:
    for fraction in source:
        to_transfer = round(fraction.mass_g * ratio, 3)
        if to_transfer <= 0:
            continue
        transferred_impurity_mg = round(fraction.impurity_mass_mg * ratio, 6)
        fraction.mass_g = round(max(fraction.mass_g - to_transfer, 0.0), 3)
        fraction.impurity_mass_mg = round(max(fraction.impurity_mass_mg - transferred_impurity_mg, 0.0), 6)
        exposure_container_ids = list(fraction.exposure_container_ids)
        if not exposure_container_ids or exposure_container_ids[-1] != target_tool.id:
            exposure_container_ids.append(target_tool.id)
        contact_impurity_mg = round(to_transfer * target_tool.contact_impurity_mg_per_g, 6)
        existing = next(
            (
                item
                for item in dest
                if item.produce_lot_id == fraction.produce_lot_id
                and item.produce_material_state_id == fraction.produce_material_state_id
                and item.exposure_container_ids == exposure_container_ids
            ),
            None,
        )
        if existing is not None:
            existing.mass_g = round(existing.mass_g + to_transfer, 3)
            existing.impurity_mass_mg = round(
                existing.impurity_mass_mg + transferred_impurity_mg + contact_impurity_mg,
                6,
            )
            continue

        dest.append(
            ProduceFraction(
                id=new_id("produce_fraction"),
                produce_lot_id=fraction.produce_lot_id,
                produce_material_state_id=fraction.produce_material_state_id,
                mass_g=to_transfer,
                unit_count=fraction.unit_count,
                is_contaminated=fraction.is_contaminated,
                impurity_mass_mg=round(transferred_impurity_mg + contact_impurity_mg, 6),
                exposure_container_ids=exposure_container_ids,
                location_kind=location_kind,
                location_id=location_id,
                container_id=target_tool.id,
                container_label=target_tool.label,
            )
        )
