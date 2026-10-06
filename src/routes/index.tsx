import { createFileRoute } from "@tanstack/react-router";
import { StartScreen } from "@/features/start/StartScreen";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "생각 연결 보드 — 조각을 움직이며 문제를 풀어요" },
      {
        name: "description",
        content: "도안을 보고 5×5 보드에 조각을 놓고 돌려 길을 잇는 아동용 디지털 교구",
      },
      { property: "og:title", content: "생각 연결 보드" },
      { property: "og:description", content: "도안을 보고 조각을 놓고 돌려 보세요." },
    ],
  }),
  component: StartScreen,
});
