import { AutosamplerRackIllustration } from "@/components/illustrations/autosampler-rack-illustration";
import { CryogenicGrinderIllustration } from "@/components/illustrations/cryogenic-grinder-illustration";
import { LcMsMsInstrumentIllustration } from "@/components/illustrations/lc-msms-instrument-illustration";
import { ProduceBasketIllustration } from "@/components/illustrations/produce-basket-illustration";
import type { WorkspaceWidgetType } from "@/types/workbench";

type WorkspaceEquipmentIconProps = {
  className?: string;
  widgetType: WorkspaceWidgetType;
};

export function WorkspaceEquipmentIcon({
  className,
  widgetType,
}: WorkspaceEquipmentIconProps) {
  if (widgetType === "autosampler_rack") {
    return (
      <div className={className} data-widget-type={widgetType}>
        <AutosamplerRackIllustration slotCount={4} tone="neutral" />
      </div>
    );
  }

  if (widgetType === "produce_basket") {
    return (
      <div className={className} data-widget-type={widgetType}>
        <ProduceBasketIllustration itemCount={5} />
      </div>
    );
  }

  if (widgetType === "cryogenic_grinder") {
    return (
      <div className={className} data-widget-type={widgetType}>
        <CryogenicGrinderIllustration />
      </div>
    );
  }

  if (widgetType === "gross_balance" || widgetType === "analytical_balance") {
    return (
      <div className={className} data-widget-type={widgetType}>
        <svg aria-label={widgetType} className="h-full w-full" viewBox="0 0 120 120">
          <rect x="12" y="18" width="96" height="84" rx="20" fill="#e2e8f0" />
          <rect x="22" y="30" width="76" height="30" rx="10" fill="#0f172a" />
          <rect x="30" y="70" width="60" height="18" rx="9" fill="#cbd5e1" stroke="#64748b" strokeWidth="4" />
          <circle cx="98" cy="82" r="6" fill={widgetType === "analytical_balance" ? "#10b981" : "#f97316"} />
        </svg>
      </div>
    );
  }

  return (
    <div className={className} data-widget-type={widgetType}>
      <LcMsMsInstrumentIllustration status="idle" />
    </div>
  );
}
