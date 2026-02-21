"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Loader2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      toast.error(error.message || "Invalid email or password");
      setLoading(false);
      return;
    }

    // Honor the middleware-set redirect param if present
    const redirectTo = searchParams.get("redirect");
    if (redirectTo) {
      window.location.href = redirectTo;
      return;
    }

    // No redirect param — resolve role for default destination
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Authentication failed. Please try again.");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    // Hard navigate to force a full request with fresh cookies.
    // router.replace() does a soft/client navigation that may reuse
    // a stale prefetched response from before cookies were set.
    if (profile?.role === "super_admin") {
      window.location.href = "/super-admin";
    } else if (profile?.role === "restaurant_admin") {
      window.location.href = "/restaurant-admin";
    } else {
      window.location.href = "/";
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-sm p-8 rounded-2xl bg-card border border-border shadow-lg text-center space-y-6">
        <div className="w-14 h-14 bg-primary/10 rounded-2xl mx-auto flex items-center justify-center">
          <UtensilsCrossed className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Welcome Back</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sign in to manage your restaurant
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 text-left">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@restaurant.com"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <LogIn className="w-4 h-4 mr-2" />
            )}
            Sign In
          </Button>
        </form>
      </div>
    </div>
  );
}
