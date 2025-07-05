import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/services/firebase";
import { cn } from "@/utils/cn";

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      alert("Login successful!");

      // Emit custom event for login success
      const loginSuccessEvent = new Event("loginSuccess");
      window.dispatchEvent(loginSuccessEvent);
    } catch (err) {
      console.error("Error signing in:", err);
      setError("Failed to login. Please check your credentials.");
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <label className="block font-semibold">Email:</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="border p-2 rounded w-full"
        />
      </div>
      <div>
        <label className="block font-semibold">Password:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="border p-2 rounded w-full"
        />
      </div>
      {error && <p className="text-red-500">{error}</p>}
      <button
        type="submit"
        className={cn(
          "w-full py-3 bg-gradient-to-r from-yellow-400 to-orange-300",
          "text-black rounded-lg font-bold hover:shadow-lg transition-all duration-200",
        )}
      >
        Login
      </button>
    </form>
  );
};

export default LoginForm;
