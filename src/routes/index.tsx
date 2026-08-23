import { createFileRoute } from "@tanstack/react-router";
import { ExamApp } from "@/components/exam/ExamApp";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <ExamApp />;
}
