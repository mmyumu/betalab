"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";

import type { BenchToolInstance, SpatulaState } from "@/types/workbench";

type PourState = {
  currentRateG: number;
  slotId: string;
  startY: number;
};

type UseSpatulaInteractionOptions = {
  isSpatulaMode: boolean;
  onLoadFromTool: (payload: { slot_id: string }) => void;
  onPourIntoTool: (payload: { delta_mass_g: number; slot_id: string }) => void;
  spatula: SpatulaState;
};

export function useSpatulaInteraction({
  isSpatulaMode,
  onLoadFromTool,
  onPourIntoTool,
  spatula,
}: UseSpatulaInteractionOptions) {
  const [spatulaCursorPosition, setSpatulaCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const [spatulaHintMessage, setSpatulaHintMessage] = useState<string | null>(null);
  const spatulaPourIntervalRef = useRef<number | null>(null);
  const spatulaPourStateRef = useRef<PourState | null>(null);

  const stopSpatulaPour = useCallback(() => {
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
        ? "Maintiens sur une fiole puis lève la souris pour verser."
        : "Clique sur une jarre ouverte pour charger la spatule.",
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
        setSpatulaHintMessage("La spatule est vide. Charge-la d'abord sur une jarre.");
        return;
      }

      event.preventDefault();
      stopSpatulaPour();
      setSpatulaHintMessage("Versement en cours...");
      spatulaPourStateRef.current = {
        currentRateG: 0.08,
        slotId,
        startY: event.clientY,
      };
      spatulaPourIntervalRef.current = window.setInterval(() => {
        const pourState = spatulaPourStateRef.current;
        if (!pourState) {
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
    stopSpatulaPour();
  }, [stopSpatulaPour]);

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
      if (!isSpatulaMode || tool.toolType !== "storage_jar") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      loadSpatulaFromTool(slotId);
    },
    [isSpatulaMode, loadSpatulaFromTool],
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

      if (tool.toolType === "storage_jar") {
        event.preventDefault();
        loadSpatulaFromTool(slotId);
        return;
      }

      if ((tool.toolType === "sample_vial" || tool.toolType === "centrifuge_tube") && !spatula.isLoaded) {
        setSpatulaHintMessage("La spatule est vide. Charge-la d'abord sur une jarre.");
      }
    },
    [isSpatulaMode, loadSpatulaFromTool, spatula.isLoaded],
  );

  return {
    handleSpatulaToolCardClick,
    handleSpatulaToolIllustrationClick,
    handleSpatulaToolPointerDown,
    handleSpatulaToolPointerUp,
    spatulaCursorPosition,
    spatulaHintMessage,
    stopSpatulaPour,
  };
}
