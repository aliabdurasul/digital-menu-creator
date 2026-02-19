import { Link } from "react-router-dom";
import { UtensilsCrossed, Shield, Store, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
          <UtensilsCrossed className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-foreground tracking-tight">
          Digital Menu
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-md">
          Beautiful digital menus for modern restaurants. Manage, customize, and share with ease.
        </p>

        <div className="mt-10 grid gap-4 w-full max-w-sm">
          <Link to="/menu/bella-cucina">
            <Button className="w-full h-12 text-base gap-2" size="lg">
              <Store className="w-5 h-5" />
              View Demo Menu
              <ArrowRight className="w-4 h-4 ml-auto" />
            </Button>
          </Link>
          <Link to="/restaurant-admin">
            <Button variant="outline" className="w-full h-12 text-base gap-2" size="lg">
              <UtensilsCrossed className="w-5 h-5" />
              Restaurant Admin
              <ArrowRight className="w-4 h-4 ml-auto" />
            </Button>
          </Link>
          <Link to="/super-admin">
            <Button variant="outline" className="w-full h-12 text-base gap-2" size="lg">
              <Shield className="w-5 h-5" />
              Super Admin
              <ArrowRight className="w-4 h-4 ml-auto" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-6 text-xs text-muted-foreground">
        Digital Menu · V1 Prototype
      </div>
    </div>
  );
};

export default Index;
