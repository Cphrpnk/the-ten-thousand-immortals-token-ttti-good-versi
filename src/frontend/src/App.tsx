import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  useRouterState,
} from "@tanstack/react-router";
import { ThemeProvider } from "next-themes";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { WhitePaperRoute } from "./components/WhitePaperRoute";
import { Toaster } from "./components/ui/sonner";
import { BuyFunnelProvider } from "./hooks/useBuyFunnel";
import { PlugProvider } from "./hooks/usePlug";
import { AdminPage } from "./pages/AdminPage";
import { BuyIcpPage } from "./pages/BuyIcpPage";
import { ExchangePage } from "./pages/ExchangePage";
import { HistoryPage } from "./pages/HistoryPage";
import { LandingPage } from "./pages/LandingPage";
import { TransferPage } from "./pages/TransferPage";
import { WalletPage } from "./pages/WalletPage";

const queryClient = new QueryClient();

function Layout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isLanding = pathname === "/";

  return (
    <BuyFunnelProvider>
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main
          className={
            isLanding
              ? "w-full flex-1"
              : "container mx-auto w-full flex-1 px-4 py-16 md:py-20"
          }
        >
          <Outlet />
        </main>
        <Footer />
      </div>
    </BuyFunnelProvider>
  );
}

const rootRoute = createRootRoute({
  component: Layout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LandingPage,
});

const buyIcpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/buy-icp",
  component: BuyIcpPage,
});

/** Buy TTTI-T page (component file kept at pages/ExchangePage.tsx). */
const buyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/buy",
  component: ExchangePage,
});

/** Former address of the buy page; kept so old links still land on /buy. */
const exchangeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/exchange",
  beforeLoad: () => {
    throw redirect({ to: "/buy", replace: true });
  },
});

const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/history",
  component: HistoryPage,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminPage,
});

const transferRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/transfer",
  component: TransferPage,
});

const walletRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/wallet",
  component: WalletPage,
});

const whitePaperRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/white-paper",
  component: WhitePaperRoute,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  buyIcpRoute,
  buyRoute,
  exchangeRoute,
  historyRoute,
  adminRoute,
  transferRoute,
  walletRoute,
  whitePaperRoute,
]);

const router = createRouter({ routeTree });

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <QueryClientProvider client={queryClient}>
        <PlugProvider>
          <RouterProvider router={router} />
          <Toaster />
        </PlugProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
