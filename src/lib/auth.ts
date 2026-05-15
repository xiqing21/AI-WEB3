import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireAuth() {
  const user = await getUser();

  if (!user) {
    redirect("/sign-in");
  }

  return user;
}

export async function requireGuest() {
  const user = await getUser();

  if (user) {
    redirect("/");
  }
}
