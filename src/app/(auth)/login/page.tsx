"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardCheck, Loader2 } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error ?? "Login failed");
        return;
      }
      const next = searchParams.get("next");
      const fallback = data.user.role === "ADMIN" ? "/dashboard" : "/my-tasks";
      router.push(next && next !== "/" ? next : fallback);
      router.refresh();
    } catch {
      setServerError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-gradient-to-b from-blue-50 via-white to-white p-6 dark:from-neutral-950 dark:via-neutral-950 dark:to-black">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <ClipboardCheck className="size-6" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Daily Task Tracker</h1>
          <p className="text-sm text-muted-foreground">Sign in to view and manage your team&apos;s tasks</p>
        </div>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-base">Welcome back</CardTitle>
            <CardDescription>Employees can use their name; admins use their email.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="identifier">Email or employee name</Label>
                <Input
                  id="identifier"
                  autoComplete="username"
                  placeholder="Rohit Sharma"
                  {...register("identifier")}
                />
                {errors.identifier && <p className="text-xs text-destructive">{errors.identifier.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>

              {serverError && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {serverError}
                </div>
              )}

              <Button type="submit" disabled={submitting} className="mt-2 w-full">
                {submitting && <Loader2 className="size-4 animate-spin" />}
                Sign in
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
