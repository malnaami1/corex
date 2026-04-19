import { useState } from "react";
import { auth } from "../lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { useLocation } from "wouter";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [, navigate] = useLocation();

  const handleSubmit = async () => {
    setError("");
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate("/landing");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
      <div className="bg-[#111d35] border border-[#00c2a8]/30 rounded-xl p-8 w-full max-w-md">
        <h1 className="text-white text-2xl font-bold mb-1">
          {isSignUp ? "Create account" : "Welcome back"}
        </h1>
        <p className="text-gray-400 text-sm mb-6">
          {isSignUp ? "Join the Corex network" : "Sign in to Corex"}
        </p>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-[#0a0f1e] border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#00c2a8]"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[#0a0f1e] border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#00c2a8]"
          />
        </div>

        {error && <p className="text-red-400 text-xs mt-3">{error}</p>}

        <button
          onClick={handleSubmit}
          className="w-full mt-6 bg-[#00c2a8] hover:bg-[#008f7a] text-black font-semibold py-3 rounded-lg transition"
        >
          {isSignUp ? "Sign Up" : "Sign In"}
        </button>

        <p className="text-gray-500 text-sm text-center mt-4">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <span
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-[#00c2a8] cursor-pointer hover:underline"
          >
            {isSignUp ? "Sign in" : "Sign up"}
          </span>
        </p>
      </div>
    </div>
  );
}