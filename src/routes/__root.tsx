import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

import { ErrorPanel } from "@/components/game/ErrorPanel";
import { Button } from "@/components/game/Button";
import { LiveAnnouncer } from "@/components/game/LiveAnnouncer";

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--background)] px-4 py-8">
      <ErrorPanel
        title="이 화면을 찾을 수 없어요."
        description="찾으려는 화면이 없거나 주소가 바뀌었어요."
        actions={
          <Link to="/" className="btn btn-primary min-w-[144px]">
            처음으로
          </Link>
        }
      />
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--background)] px-4 py-8">
      <ErrorPanel
        title="화면을 불러오지 못했어요."
        description="인터넷 연결을 확인하고 다시 눌러 주세요."
        code={error instanceof Error ? error.message : undefined}
        actions={
          <>
            <Button
              variant="primary"
              onClick={() => {
                router.invalidate();
                reset();
              }}
              className="min-w-[144px]"
            >
              다시 시도
            </Button>
            <Link to="/" className="btn btn-secondary min-w-[144px]">
              처음으로
            </Link>
          </>
        }
      />
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "생각 연결 보드" },
      { name: "description", content: "5×5 보드에서 조각을 놓고 돌리며 푸는 아동용 인지발달 교구" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "생각 연결 보드" },
      {
        property: "og:description",
        content: "5×5 보드에서 조각을 놓고 돌리며 푸는 아동용 인지발달 교구",
      },
      { name: "theme-color", content: "#10b981" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "생각 연결 보드" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "alternate icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <div id="app-root" className="min-h-dvh flex flex-col">
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
      </div>
      <LiveAnnouncer />
    </QueryClientProvider>
  );
}
