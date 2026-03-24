import { AutosamplerRackIllustration } from "@/components/illustrations/autosampler-rack-illustration";
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

  return (
    <div className={className} data-widget-type={widgetType}>
      <LcMsMsInstrumentIllustration status="idle" />
    </div>
  );
}
