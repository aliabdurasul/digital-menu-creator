import Link from "next/link";
import { LogIn, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="w-20 h-20 mb-5">
          <Image
            src="/logo.svg"
            alt="Lezzet-i Âlâ"
            width={80}
            height={80}
            priority
          />
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
          <span className="text-primary">Lezzet-i</span>{" "}
          <span className="text-foreground">Âlâ</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-md">
          Restoranınız için modern dijital menü sistemi. Kolayca yönetin,
          özelleştirin ve paylaşın.
        </p>

        <div className="mt-10 grid gap-4 w-full max-w-sm">
          <Link href="/login">
            <Button className="w-full h-12 text-base gap-2" size="lg">
              <LogIn className="w-5 h-5" />
              Giriş Yap
              <ArrowRight className="w-4 h-4 ml-auto" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-6 text-xs text-muted-foreground">
        © 2026 Lezzet-i Âlâ
      </div>
    </div>
  );
}
