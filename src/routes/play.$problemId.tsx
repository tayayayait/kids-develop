import { createFileRoute } from "@tanstack/react-router";
import { problemById } from "@/game/content";
import { PlayScreen } from "@/features/play/PlayScreen";

export const Route = createFileRoute("/play/$problemId")({
  head: ({ params }) => {
    const p = problemById(params.problemId);
    const title = p
      ? `문제 ${p.order}. ${p.title} — 생각 연결 보드`
      : "문제를 찾을 수 없어요 — 생각 연결 보드";
    return {
      meta: [{ title }],
    };
  },
  component: PlayRouteComponent,
});

function PlayRouteComponent() {
  const { problemId } = Route.useParams();
  return <PlayScreen problemId={problemId} />;
}
