from __future__ import annotations

from datetime import datetime, timezone

from app.domain.models import (
    Experiment,
    LimsReception,
    PrintedLabelTicket,
    TrashSampleLabelEntry,
    WorkbenchTool,
    new_id,
)
from app.services.command_handlers.support import build_lims_label, find_workbench_slot
from app.services.commands import (
    ApplyPrintedLimsLabelToGrossBalanceBagCommand,
    ApplyPrintedLimsLabelToBasketBagCommand,
    ApplyPrintedLimsLabelCommand,
    CreateLimsReceptionCommand,
    DiscardPrintedLimsLabelCommand,
    PlaceReceivedBagOnWorkbenchCommand,
    PrintLimsLabelCommand,
    RecordGrossWeightCommand,
    SetGrossMassOffsetCommand,
)
from app.services.received_sample_generation import resolve_received_bag_gross_mass_g
from app.services.command_handlers.support import find_workspace_widget


def place_received_bag_on_workbench(
    experiment: Experiment,
    command: PlaceReceivedBagOnWorkbenchCommand,
) -> None:
    slot = find_workbench_slot(experiment.workbench, command.target_slot_id)
    if experiment.basket_tool is None:
        raise ValueError("The received sampling bag has already been removed from the basket.")
    if slot.tool is not None or slot.surface_produce_lots:
        raise ValueError(f"{slot.label} already contains a tool")

    slot.tool = experiment.basket_tool
    experiment.basket_tool = None
    experiment.audit_log.append(f"Received sampling bag moved from basket to {slot.label}.")


def record_gross_weight(experiment: Experiment, command: RecordGrossWeightCommand) -> None:
    measured_mass_g = _resolve_received_sampling_bag_gross_mass(experiment, command.measured_gross_mass_g)
    if measured_mass_g is None:
        measured_mass_g = _find_first_present_received_bag_gross_mass(experiment)
    if measured_mass_g is None:
        raise ValueError("Place the received sampling bag before recording its gross mass.")
    if measured_mass_g <= 0:
        raise ValueError("Gross balance mass must be greater than zero.")

    experiment.lims_reception.measured_gross_mass_g = measured_mass_g
    experiment.audit_log.append(
        f"Gross reception weight recorded at {measured_mass_g:.1f} g."
    )


def set_gross_mass_offset(experiment: Experiment, command: SetGrossMassOffsetCommand) -> None:
    if command.gross_mass_offset_g < -100 or command.gross_mass_offset_g > 0:
        raise ValueError("Gross balance offset must stay between -100 g and 0 g.")

    experiment.lims_reception.gross_mass_offset_g = int(command.gross_mass_offset_g)
    experiment.audit_log.append(
        f"Gross balance container offset set to {command.gross_mass_offset_g:+d} g."
    )


def create_lims_reception(
    experiment: Experiment,
    command: CreateLimsReceptionCommand,
) -> None:
    if command.measured_gross_mass_g is not None and command.measured_gross_mass_g <= 0:
        raise ValueError("Gross reception mass must be greater than zero.")
    if command.measured_sample_mass_g is not None and command.measured_sample_mass_g <= 0:
        raise ValueError("Sample mass must be greater than zero.")

    measured_gross_mass_g = _resolve_measured_gross_mass_g(experiment, command.measured_gross_mass_g)
    if command.entry_id is None:
        entry = _build_lims_reception_entry(
            experiment,
            command,
            measured_gross_mass_g=measured_gross_mass_g,
            entry_id=new_id("lims_entry"),
            lab_sample_code=_build_sample_code(experiment),
            printed_label_ticket=None,
            status="awaiting_label_application",
        )
        experiment.lims_entries.append(entry)
        experiment.audit_log.append(f"LIMS reception created for {entry.lab_sample_code}.")
    else:
        entry = _find_lims_entry(experiment, command.entry_id)
        _update_lims_reception_entry(
            entry,
            experiment,
            command,
            measured_gross_mass_g=measured_gross_mass_g,
        )
        experiment.audit_log.append(f"LIMS reception updated for {entry.lab_sample_code}.")

    experiment.lims_reception = _clone_lims_entry(
        entry,
        printed_label_ticket=entry.printed_label_ticket,
    )


def print_lims_label(experiment: Experiment, command: PrintLimsLabelCommand) -> None:
    entry = _resolve_lims_entry_for_print(experiment, command.entry_id)
    sample_code = entry.lab_sample_code
    if sample_code is None:
        raise ValueError("Create the LIMS reception entry before printing a label.")
    if experiment.lims_reception.printed_label_ticket is not None:
        raise ValueError("Remove the current printed ticket from the LIMS before printing another label.")

    ticket = PrintedLabelTicket(
        id=new_id("lims_ticket"),
        sample_code=sample_code,
        label_text=sample_code,
        received_date=datetime.now(timezone.utc).date().isoformat(),
    )
    entry.printed_label_ticket = ticket
    experiment.lims_reception = _clone_lims_entry(entry, printed_label_ticket=ticket)
    experiment.audit_log.append(f"LIMS label printed for {sample_code}.")


def discard_printed_lims_label(
    experiment: Experiment,
    _command: DiscardPrintedLimsLabelCommand,
) -> None:
    ticket = experiment.lims_reception.printed_label_ticket
    if ticket is None:
        raise ValueError("There is no printed LIMS ticket to discard.")

    _clear_printed_ticket_for_sample_code(experiment, ticket.sample_code)
    experiment.lims_reception.printed_label_ticket = None
    experiment.trash.sample_labels.append(
        TrashSampleLabelEntry(
            id=new_id("trash_sample_label"),
            origin_label="LIMS terminal",
            label=build_lims_label(
                sample_code=ticket.sample_code,
                text=ticket.label_text,
                received_date=ticket.received_date,
            ),
        )
    )
    experiment.audit_log.append(f"LIMS label {ticket.sample_code} discarded from terminal.")


def apply_printed_lims_label(
    experiment: Experiment,
    command: ApplyPrintedLimsLabelCommand,
) -> None:
    slot = find_workbench_slot(experiment.workbench, command.slot_id)
    if slot.tool is None:
        raise ValueError(f"{slot.label} does not contain a tool.")

    ticket = _require_printed_lims_ticket(experiment)
    _apply_ticket_to_tool(slot.tool, ticket)
    _consume_printed_lims_ticket(experiment, ticket)
    experiment.audit_log.append(f"LIMS label {ticket.sample_code} applied to {slot.tool.label}.")


def apply_printed_lims_label_to_basket_bag(
    experiment: Experiment,
    _command: ApplyPrintedLimsLabelToBasketBagCommand,
) -> None:
    basket_tool = _require_received_sampling_bag(
        experiment.basket_tool,
        "The produce basket does not contain the received sampling bag.",
    )
    ticket = _require_printed_lims_ticket(experiment)
    _apply_ticket_to_tool(basket_tool, ticket)
    _consume_printed_lims_ticket(experiment, ticket)
    experiment.audit_log.append(f"LIMS label {ticket.sample_code} applied to {basket_tool.label}.")


def apply_printed_lims_label_to_gross_balance_bag(
    experiment: Experiment,
    _command: ApplyPrintedLimsLabelToGrossBalanceBagCommand,
) -> None:
    balance_widget = find_workspace_widget(experiment.workspace, "gross_balance")
    balance_tool = _require_received_sampling_bag(
        balance_widget.tool,
        "The gross balance does not contain the received sampling bag.",
    )
    ticket = _require_printed_lims_ticket(experiment)
    _apply_ticket_to_tool(balance_tool, ticket)
    _consume_printed_lims_ticket(experiment, ticket)
    experiment.audit_log.append(f"LIMS label {ticket.sample_code} applied to {balance_tool.label}.")


def _build_sample_code(experiment: Experiment) -> str:
    existing_suffixes = [
        int(entry.lab_sample_code.rsplit("-", 1)[-1])
        for entry in experiment.lims_entries
        if entry.lab_sample_code is not None and entry.lab_sample_code.rsplit("-", 1)[-1].isdigit()
    ]
    next_sequence = max(existing_suffixes, default=0) + 1
    return f"APP-2026-{next_sequence:04d}"


def _resolve_measured_gross_mass_g(
    experiment: Experiment,
    measured_gross_mass_g: float | None,
) -> float | None:
    if measured_gross_mass_g is not None:
        return float(measured_gross_mass_g)
    if experiment.lims_reception.measured_gross_mass_g is not None:
        return float(experiment.lims_reception.measured_gross_mass_g) + float(
            experiment.lims_reception.gross_mass_offset_g
        )
    return None


def _resolve_received_sampling_bag_gross_mass(
    experiment: Experiment,
    measured_gross_mass_g: float | None,
) -> float | None:
    if measured_gross_mass_g is not None:
        return float(measured_gross_mass_g)
    return resolve_received_bag_gross_mass_g(experiment.basket_tool)


def _find_first_present_received_bag_gross_mass(experiment: Experiment) -> float | None:
    for slot in experiment.workbench.slots:
        gross_mass_g = resolve_received_bag_gross_mass_g(slot.tool)
        if gross_mass_g is not None:
            return gross_mass_g
    return None


def _find_lims_entry(experiment: Experiment, entry_id: str) -> LimsReception:
    for entry in experiment.lims_entries:
        if entry.id == entry_id:
            return entry
    raise ValueError("The selected LIMS entry does not exist.")


def _resolve_lims_entry_for_print(experiment: Experiment, entry_id: str | None) -> LimsReception:
    if entry_id is not None:
        return _find_lims_entry(experiment, entry_id)
    if experiment.lims_reception.id is not None:
        return _find_lims_entry(experiment, experiment.lims_reception.id)
    raise ValueError("Create the LIMS reception entry before printing a label.")


def _clone_lims_entry(
    entry: LimsReception,
    *,
    printed_label_ticket: PrintedLabelTicket | None,
) -> LimsReception:
    return LimsReception(
        id=entry.id,
        orchard_name=entry.orchard_name,
        harvest_date=entry.harvest_date,
        indicative_mass_g=entry.indicative_mass_g,
        measured_gross_mass_g=entry.measured_gross_mass_g,
        gross_mass_offset_g=entry.gross_mass_offset_g,
        measured_sample_mass_g=entry.measured_sample_mass_g,
        lab_sample_code=entry.lab_sample_code,
        status=entry.status,
        printed_label_ticket=printed_label_ticket,
    )


def _build_lims_reception_entry(
    experiment: Experiment,
    command: CreateLimsReceptionCommand,
    *,
    measured_gross_mass_g: float | None,
    entry_id: str,
    lab_sample_code: str,
    printed_label_ticket: PrintedLabelTicket | None,
    status: str,
) -> LimsReception:
    return LimsReception(
        id=entry_id,
        orchard_name=command.orchard_name.strip(),
        harvest_date=command.harvest_date.strip(),
        indicative_mass_g=float(command.indicative_mass_g),
        measured_gross_mass_g=measured_gross_mass_g,
        gross_mass_offset_g=experiment.lims_reception.gross_mass_offset_g,
        measured_sample_mass_g=(
            float(command.measured_sample_mass_g)
            if command.measured_sample_mass_g is not None
            else None
        ),
        lab_sample_code=lab_sample_code,
        status=status,
        printed_label_ticket=printed_label_ticket,
    )


def _update_lims_reception_entry(
    entry: LimsReception,
    experiment: Experiment,
    command: CreateLimsReceptionCommand,
    *,
    measured_gross_mass_g: float | None,
) -> None:
    entry.orchard_name = command.orchard_name.strip()
    entry.harvest_date = command.harvest_date.strip()
    entry.indicative_mass_g = float(command.indicative_mass_g)
    entry.measured_gross_mass_g = measured_gross_mass_g
    entry.gross_mass_offset_g = experiment.lims_reception.gross_mass_offset_g
    entry.measured_sample_mass_g = (
        float(command.measured_sample_mass_g)
        if command.measured_sample_mass_g is not None
        else None
    )


def _require_printed_lims_ticket(experiment: Experiment) -> PrintedLabelTicket:
    ticket = experiment.lims_reception.printed_label_ticket
    if ticket is None:
        raise ValueError("Print the LIMS label before applying it to the bag.")
    return ticket


def _require_received_sampling_bag(
    tool: WorkbenchTool | None,
    missing_message: str,
) -> WorkbenchTool:
    if tool is None or tool.tool_type != "sample_bag":
        raise ValueError(missing_message)
    return tool


def _apply_ticket_to_tool(tool: WorkbenchTool, ticket: PrintedLabelTicket) -> None:
    tool.labels.append(
        build_lims_label(
            sample_code=ticket.sample_code,
            text=ticket.label_text,
            received_date=ticket.received_date,
        )
    )


def _consume_printed_lims_ticket(experiment: Experiment, ticket: PrintedLabelTicket) -> None:
    _clear_printed_ticket_for_sample_code(experiment, ticket.sample_code)
    experiment.lims_reception.printed_label_ticket = None
    for entry in experiment.lims_entries:
        if entry.lab_sample_code == ticket.sample_code:
            entry.status = "received"
            experiment.lims_reception = _clone_lims_entry(entry, printed_label_ticket=None)
            return
    experiment.lims_reception.status = "received"


def _clear_printed_ticket_for_sample_code(experiment: Experiment, sample_code: str) -> None:
    for entry in experiment.lims_entries:
        if entry.lab_sample_code == sample_code:
            entry.printed_label_ticket = None
            return
