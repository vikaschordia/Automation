import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

// The proxy already redirects unauthenticated/authenticated users away from "/" — this is a
// defensive fallback in case the route is ever reached directly.
export default async function Home() {
  const session = await getSession();
  redirect(!session ? "/login" : session.role === "ADMIN" ? "/dashboard" : "/my-tasks");
}
