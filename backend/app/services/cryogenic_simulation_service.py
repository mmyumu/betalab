from app.services.physical_simulation_service import (
    ContainerClosureRisk,
    PhysicalSimulationService,
)


# Compatibility shim while the codebase transitions to the broader physics naming.
CryogenicSimulationService = PhysicalSimulationService
