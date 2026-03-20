import { redirect } from "next/navigation";

export default function Home() {
  // Project entry point should be the dashboard.
  redirect("/dashboard");
}
