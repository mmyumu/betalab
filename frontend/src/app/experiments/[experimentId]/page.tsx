import { LabScene } from "@/components/lab-scene";

type ExperimentPageProps = {
  params: Promise<{
    experimentId: string;
  }>;
};

export default async function ExperimentPage({ params }: ExperimentPageProps) {
  const { experimentId } = await params;
  return <LabScene experimentId={experimentId} />;
}
