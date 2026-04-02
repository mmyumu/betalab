from __future__ import annotations

from app.domain.models import Experiment, PrintedLabelTicket, new_id
from app.services.command_handlers.support import find_workbench_slot
from app.services.commands import (
    ApplyPrintedLimsLabelCommand,
    CreateLimsReceptionCommand,
    DiscardPrintedLimsLabelCommand,
    PlaceReceivedBagOnWorkbenchCommand,
    PrintLimsLabelCommand,
    RecordGrossWeightCommand,
)
from app.services.received_sample_generation import resolve_received_bag_gross_mass_g


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
    measured_mass_g = (
        float(command.measured_gross_mass_g)
        if command.measured_gross_mass_g is not None
        else resolve_received_bag_gross_mass_g(experiment.basket_tool)
    )
    if measured_mass_g is None:
        measured_mass_g = next(
            (
                gross_mass_g
                for gross_mass_g in (
                    resolve_received_bag_gross_mass_g(slot.tool)
                    for slot in experiment.workbench.slots
                )
                if gross_mass_g is not None
            ),
            None,
        )
    if measured_mass_g is None:
        raise ValueError("Place the received sampling bag before recording its gross mass.")
    if measured_mass_g <= 0:
        raise ValueError("Gross balance mass must be greater than zero.")

    experiment.lims_reception.measured_gross_mass_g = measured_mass_g
    experiment.audit_log.append(
        f"Gross reception weight recorded at {measured_mass_g:.1f} g."
    )


def create_lims_reception(
    experiment: Experiment,
    command: CreateLimsReceptionCommand,
) -> None:
    if command.measured_gross_mass_g is not None and command.measured_gross_mass_g <= 0:
        raise ValueError("Gross reception mass must be greater than zero.")

    sample_code = experiment.lims_reception.lab_sample_code or _build_sample_code(experiment)
    experiment.lims_reception.orchard_name = command.orchard_name.strip()
    experiment.lims_reception.harvest_date = command.harvest_date.strip()
    experiment.lims_reception.indicative_mass_g = float(command.indicative_mass_g)
    if command.measured_gross_mass_g is not None:
        experiment.lims_reception.measured_gross_mass_g = float(command.measured_gross_mass_g)
    experiment.lims_reception.lab_sample_code = sample_code
    experiment.lims_reception.status = "awaiting_label_application"
    experiment.audit_log.append(f"LIMS reception created for {sample_code}.")


def print_lims_label(experiment: Experiment, _command: PrintLimsLabelCommand) -> None:
    sample_code = experiment.lims_reception.lab_sample_code
    if sample_code is None:
        raise ValueError("Create the LIMS reception entry before printing a label.")
    if experiment.lims_reception.printed_label_ticket is not None:
        raise ValueError("Remove the current printed ticket from the LIMS before printing another label.")

    experiment.lims_reception.printed_label_ticket = PrintedLabelTicket(
        id=new_id("lims_ticket"),
        sample_code=sample_code,
        label_text=f"{sample_code} • Apples",
    )
    experiment.audit_log.append(f"LIMS label printed for {sample_code}.")


def discard_printed_lims_label(
    experiment: Experiment,
    _command: DiscardPrintedLimsLabelCommand,
) -> None:
    ticket = experiment.lims_reception.printed_label_ticket
    if ticket is None:
        raise ValueError("There is no printed LIMS ticket to discard.")

    experiment.lims_reception.printed_label_ticket = None
    experiment.audit_log.append(f"LIMS label {ticket.sample_code} discarded from terminal.")


def apply_printed_lims_label(
    experiment: Experiment,
    command: ApplyPrintedLimsLabelCommand,
) -> None:
    slot = find_workbench_slot(experiment.workbench, command.slot_id)
    if slot.tool is None or slot.tool.tool_type != "sample_bag":
        raise ValueError(f"{slot.label} does not contain the received sampling bag.")

    ticket = experiment.lims_reception.printed_label_ticket
    if ticket is None:
        raise ValueError("Print the LIMS label before applying it to the bag.")

    slot.tool.sample_label_text = ticket.label_text
    experiment.lims_reception.printed_label_ticket = None
    experiment.lims_reception.status = "received"
    experiment.audit_log.append(f"LIMS label {ticket.sample_code} applied to {slot.tool.label}.")


def _build_sample_code(experiment: Experiment) -> str:
    experiment_count = int("".join(character for character in experiment.id if character.isdigit())[-4:] or "1")
    return f"APP-2026-{experiment_count:04d}"
