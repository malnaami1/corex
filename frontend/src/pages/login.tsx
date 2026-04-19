import { useState } from "react";
import { auth, db } from "../lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useLocation } from "wouter";
import { setRole } from "@/lib/role";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [location, navigate] = useLocation();

  const role = new URLSearchParams(window.location.search).get("role");

  const handleSubmit = async () => {
    setError("");
    try {
      if (isSignUp) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", cred.user.uid), {
          email: cred.user.email,
          role: role,
          createdAt: new Date().toISOString(),
        });
        setRole(role as "worker" | "company");
        navigate(role === "worker" ? "/worker" : "/company");
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const snap = await getDoc(doc(db, "users", cred.user.uid));
        const userRole = snap.data()?.role;
        setRole(userRole as "worker" | "company");
        navigate(userRole === "worker" ? "/worker" : "/company");
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-lg font-bold tracking-tight">Corex</span>
            <p className="text-xs text-muted-foreground">Core in. Execute out.</p>
          </div>
          <span className="text-xs font-mono text-muted-foreground hidden sm:inline">v1.0 · MOCK</span>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-2 text-xs font-medium text-primary bg-primary/10 border border-primary/30 px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              {role === "worker" ? "Joining as Worker" : "Joining as Company"}
            </span>
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-center mb-2">
            {isSignUp ? "Create account" : "Welcome back"}
          </h1>
          <p className="text-muted-foreground text-sm text-center mb-8">
            {isSignUp ? "Join the Corex network" : "Sign in to continue"}
          </p>

          <div className="bg-card border border-border rounded-xl p-8">
            <div className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-background border border-border text-foreground rounded-md px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-background border border-border text-foreground rounded-md px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
              />
            </div>

            {error && <p className="text-red-400 text-xs mt-3">{error}</p>}

            <button
              onClick={handleSubmit}
              className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-[#05070F] bg-primary hover:bg-[#A8D0FF] rounded-md transition-colors"
            >
              {isSignUp ? "Sign Up" : "Sign In"}
            </button>

            <p className="text-muted-foreground text-sm text-center mt-4">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <span
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-primary cursor-pointer hover:underline"
              >
                {isSignUp ? "Sign in" : "Sign up"}
              </span>
            </p>
          </div>

          <p
            onClick={() => navigate("/")}
            className="text-muted-foreground text-xs text-center mt-4 cursor-pointer hover:text-foreground transition-colors"
          >
            ← Back to home
          </p>
        </div>
      </div>
    </div>
  );
}