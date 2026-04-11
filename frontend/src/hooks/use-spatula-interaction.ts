"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";

import type { BenchToolInstance, SpatulaState } from "@/types/workbench";

const HOLD_THRESHOLD_MS = 200;
const CLICK_INCREMENT_MU_G = 0.05;
const CLICK_INCREMENT_SIGMA_G = 0.007;

// Types that can be loaded from (mirrors backend restriction)
const SPATULA_LOAD_SOURCE_TYPES = new Set(["storage_jar", "centrifuge_tube", "beaker", "sample_bag"]);

function randomNormalIncrement(): number {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const value = CLICK_INCREMENT_MU_G + CLICK_INCREMENT_SIGMA_G * z;
  return Math.round(Math.max(0.01, Math.min(0.15, value)) * 1000) / 1000;
}

type PourState = {
  currentRateG: number;
  isHolding: boolean;
  slotId: string;
  startY: number;
};

type UseSpatulaInteractionOptions = {
  isSpatulaMode: boolean;
  onDiscardSpatula: () => void;
  onLoadFromTool: (payload: { slot_id: string }) => void;
  onPourIntoTool: (payload: { delta_mass_g: number; slot_id: string }) => void;
  onPourIntoAnalyticalBalanceTool: (payload: { delta_mass_g: number }) => void;
  spatula: SpatulaState;
};

export function useSpatulaInteraction({
  isSpatulaMode,
  onDiscardSpatula,
  onLoadFromTool,
  onPourIntoTool,
  onPourIntoAnalyticalBalanceTool,
  spatula,
}: UseSpatulaInteractionOptions) {
  const [spatulaCursorPosition, setSpatulaCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const [spatulaHintMessage, setSpatulaHintMessage] = useState<string | null>(null);
  const spatulaPourIntervalRef = useRef<number | null>(null);
  const spatulaPourHoldTimeoutRef = useRef<number | null>(null);
  const spatulaPourStateRef = useRef<PourState | null>(null);
  // Prevents click-reload when spatula empties mid-hold and pointerup fires
  const justPouredRef = useRef(false);

  const stopSpatulaPour = useCallback(() => {
    if (spatulaPourHoldTimeoutRef.current !== null) {
      window.clearTimeout(spatulaPourHoldTimeoutRef.current);
      spatulaPourHoldTimeoutRef.current = null;
    }
    if (spatulaPourIntervalRef.current !== null) {
      window.clearInterval(spatulaPourIntervalRef.current);
      spatulaPourIntervalRef.current = null;
    }
    spatulaPourStateRef.current = null;
  }, []);

  useEffect(() => {
    if (!isSpatulaMode) {
      setSpatulaHintMessage(null);
      return;
    }

    setSpatulaHintMessage(
      spatula.isLoaded
        ? "Clique pour verser un peu · Maintiens et lève pour verser vite."
        : "Clique sur un container ouvert avec de la poudre pour charger la spatule.",
    );
  }, [isSpatulaMode, spatula.isLoaded]);

  useEffect(() => {
    if (!isSpatulaMode) {
      setSpatulaCursorPosition(null);
      stopSpatulaPour();
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      setSpatulaCursorPosition({ x: event.clientX, y: event.clientY });
      const pourState = spatulaPourStateRef.current;
      if (!pourState) {
        return;
      }

      const liftPx = Math.max(pourState.startY - event.clientY, 0);
      pourState.currentRateG = Math.min(0.28, 0.06 + liftPx * 0.0022);
    };

    const handlePointerUp = () => {
      stopSpatulaPour();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      stopSpatulaPour();
    };
  }, [isSpatulaMode, stopSpatulaPour]);

  const handleSpatulaToolPointerDown = useCallback(
    (slotId: string, tool: BenchToolInstance, event: ReactPointerEvent<HTMLElement>) => {
      if (!isSpatulaMode || event.button !== 0) {
        return;
      }

      if (tool.toolType !== "sample_vial" && tool.toolType !== "centrifuge_tube") {
        return;
      }

      if (!spatula.isLoaded) {
        setSpatulaHintMessage("La spatule est vide. Charge-la d'abord sur un container ouvert.");
        return;
      }

      event.preventDefault();
      stopSpatulaPour();
      setSpatulaHintMessage("Versement en cours...");
      spatulaPourStateRef.current = {
        currentRateG: 0.08,
        isHolding: false,
        slotId,
        startY: event.clientY,
      };
      spatulaPourHoldTimeoutRef.current = window.setTimeout(() => {
        if (spatulaPourStateRef.current) {
          spatulaPourStateRef.current.isHolding = true;
        }
        spatulaPourHoldTimeoutRef.current = null;
      }, HOLD_THRESHOLD_MS);
      spatulaPourIntervalRef.current = window.setInterval(() => {
        const pourState = spatulaPourStateRef.current;
        if (!pourState || !pourState.isHolding) {
          return;
        }

        onPourIntoTool({
          slot_id: pourState.slotId,
          delta_mass_g: Number(pourState.currentRateG.toFixed(3)),
        });
      }, 100);
    },
    [isSpatulaMode, onPourIntoTool, spatula.isLoaded, stopSpatulaPour],
  );

  const handleSpatulaToolPointerUp = useCallback(() => {
    const pourState = spatulaPourStateRef.current;
    if (pourState) {
      justPouredRef.current = true;
      if (!pourState.isHolding) {
        const delta = randomNormalIncrement();
        if (pourState.slotId === "analytical_balance") {
          onPourIntoAnalyticalBalanceTool({ delta_mass_g: delta });
        } else {
          onPourIntoTool({ slot_id: pourState.slotId, delta_mass_g: delta });
        }
      }
    }
    stopSpatulaPour();
  }, [onPourIntoAnalyticalBalanceTool, onPourIntoTool, stopSpatulaPour]);

  const loadSpatulaFromTool = useCallback(
    (slotId: string) => {
      stopSpatulaPour();
      setSpatulaHintMessage("Chargement de la spatule...");
      onLoadFromTool({ slot_id: slotId });
    },
    [onLoadFromTool, stopSpatulaPour],
  );

  const handleSpatulaToolIllustrationClick = useCallback(
    (slotId: string, tool: BenchToolInstance, event: ReactMouseEvent<HTMLButtonElement>) => {
      if (!isSpatulaMode || !SPATULA_LOAD_SOURCE_TYPES.has(tool.toolType)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      loadSpatulaFromTool(slotId);
    },
    [isSpatulaMode, loadSpatulaFromTool],
  );

  const handleSpatulaAnalyticalBalancePointerDown = useCallback(
    (tool: BenchToolInstance, event: ReactPointerEvent<HTMLElement>) => {
      if (!isSpatulaMode || event.button !== 0) {
        return;
      }

      if (tool.toolType !== "sample_vial" && tool.toolType !== "centrifuge_tube") {
        return;
      }

      if (!spatula.isLoaded) {
        setSpatulaHintMessage("La spatule est vide. Charge-la d'abord sur un container ouvert.");
        return;
      }

      event.preventDefault();
      stopSpatulaPour();
      setSpatulaHintMessage("Versement en cours...");
      spatulaPourStateRef.current = {
        currentRateG: 0.08,
        isHolding: false,
        slotId: "analytical_balance",
        startY: event.clientY,
      };
      spatulaPourHoldTimeoutRef.current = window.setTimeout(() => {
        if (spatulaPourStateRef.current) {
          spatulaPourStateRef.current.isHolding = true;
        }
        spatulaPourHoldTimeoutRef.current = null;
      }, HOLD_THRESHOLD_MS);
      spatulaPourIntervalRef.current = window.setInterval(() => {
        const pourState = spatulaPourStateRef.current;
        if (!pourState || !pourState.isHolding) {
          return;
        }

        onPourIntoAnalyticalBalanceTool({
          delta_mass_g: Number(pourState.currentRateG.toFixed(3)),
        });
      }, 100);
    },
    [isSpatulaMode, onPourIntoAnalyticalBalanceTool, spatula.isLoaded, stopSpatulaPour],
  );

  const handleSpatulaToolCardClick = useCallback(
    (slotId: string, tool: BenchToolInstance, event: ReactMouseEvent<HTMLElement>) => {
      if (!isSpatulaMode) {
        return;
      }

      const target = event.target;
      if (target instanceof HTMLElement && target.closest("button, input, textarea, select")) {
        return;
      }

      if (SPATULA_LOAD_SOURCE_TYPES.has(tool.toolType) && !spatula.isLoaded) {
        if (justPouredRef.current) {
          justPouredRef.current = false;
          return;
        }
        event.preventDefault();
        loadSpatulaFromTool(slotId);
        return;
      }
      justPouredRef.current = false;

      if ((tool.toolType === "sample_vial" || tool.toolType === "centrifuge_tube") && !spatula.isLoaded) {
        setSpatulaHintMessage("La spatule est vide. Charge-la d'abord sur un container ouvert.");
      }
    },
    [isSpatulaMode, loadSpatulaFromTool, spatula.isLoaded],
  );

  const handleSpatulaTrashClick = useCallback(() => {
    if (!isSpatulaMode || !spatula.isLoaded) {
      return;
    }
    onDiscardSpatula();
  }, [isSpatulaMode, onDiscardSpatula, spatula.isLoaded]);

  return {
    handleSpatulaAnalyticalBalancePointerDown,
    handleSpatulaToolCardClick,
    handleSpatulaToolIllustrationClick,
    handleSpatulaToolPointerDown,
    handleSpatulaToolPointerUp,
    handleSpatulaTrashClick,
    spatulaCursorPosition,
    spatulaHintMessage,
    stopSpatulaPour,
  };
}
