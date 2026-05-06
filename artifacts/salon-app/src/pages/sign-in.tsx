import { SignIn } from "@clerk/react";
import { Flower2 } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: "linear-gradient(160deg,hsl(338,60%,97%) 0%,hsl(22,55%,95%) 50%,hsl(278,40%,97%) 100%)" }}>

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, hsl(338,80%,75%) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, hsl(278,70%,70%) 0%, transparent 70%)" }} />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-md">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-xl"
            style={{ background: "linear-gradient(135deg,hsl(338,62%,55%),hsl(318,55%,45%))" }}>
            <Flower2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="font-serif text-3xl font-bold" style={{ color: "hsl(338,55%,30%)" }}>Luminee</h1>
          <p className="text-muted-foreground text-sm mt-1">Área administrativa do salão</p>
        </div>

        <SignIn
          routing="hash"
          signUpUrl={`${basePath}/sign-up`}
          fallbackRedirectUrl={`${basePath}/dashboard`}
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "rounded-3xl shadow-xl border-0 w-full",
              headerTitle: "font-serif",
              formButtonPrimary: "rounded-xl",
              footerActionLink: "text-primary",
            }
          }}
        />
      </div>
    </div>
  );
}
