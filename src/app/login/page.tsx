import { redirect } from "next/navigation";
import { getActor } from "@/lib/access";
import { AuthForm } from "@/components/auth-form";

export default async function LoginPage() {
  const actor = await getActor();
  if (actor)
    redirect(
      actor.role === "ADMIN"
        ? "/admin"
        : actor.role === "COCINA"
          ? "/cocina"
          : "/cuenta",
    );
  return <AuthForm mode="login" />;
}
