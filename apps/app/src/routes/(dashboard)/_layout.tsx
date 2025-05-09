import { Navigate, redirect } from "@tanstack/react-router";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import { useAuth } from "../../auth";
import { Sidebar } from "../../components/Sidebar";

export const Route = createFileRoute("/(dashboard)/_layout")({
  component: LayoutComponent,
  beforeLoad: ({ context }) => {
    if (!context.auth.token) {
      throw redirect({ to: "/auth/sign-in" });
    }
  },
});

function LayoutComponent() {
  const { token } = useAuth();

  if (!token) {
    return <Navigate to="/auth/sign-in" />;
  }

  return (
    <div className="w-screen h-screen flex">
      <div className="p-4 border-r border-default-100 max-w-[160px] w-full">
        <Sidebar />
      </div>
      <div className="grow basis-0 overflow-auto h-screen">
        <Outlet />
      </div>
    </div>
  );
}
