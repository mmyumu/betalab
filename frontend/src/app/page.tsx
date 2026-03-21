import { LabShell } from "@/components/lab-shell";
import { mockExperiment } from "@/lib/mock-experiment";

export default function HomePage() {
  return <LabShell experiment={mockExperiment} />;
}
