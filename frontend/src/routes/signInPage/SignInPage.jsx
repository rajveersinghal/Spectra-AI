// src/routes/signInPage/SignInPage.jsx (Revised)

import { SignIn } from "@clerk/clerk-react";
import "./signInPage.css";
import React, { useContext, useState } from "react";
import { ThemeContext } from "../../context/ThemeContext";
import { dark } from "@clerk/themes";

const SignInPage = () => {
  const { theme } = useContext(ThemeContext);
  const hasClerk = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePosition({ x, y });
  };

  if (!hasClerk) {
    return <div className="signInPage">Authentication is not configured.</div>;
  }

  return (
    <div
      className="signInPage interactive-bg"
      onMouseMove={handleMouseMove}
      style={{
        '--mouse-x': `${mousePosition.x}%`,
        '--mouse-y': `${mousePosition.y}%`,
      }}
    >
      {/* NEW: Re-introducing a decorative orbital element for visual consistency */}
      <img src="/orbital.png" alt="Orbital background" className="orbital-bg-sign-in" />
      
      <SignIn
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
        afterSignInUrl="/dashboard"
        appearance={{
          baseTheme: theme === "dark" ? dark : undefined,
          elements: {
            card: {
              zIndex: 10,
              backgroundColor: 'var(--bg-primary)',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
            },
          },
        }}
      />
    </div>
  );
};

export default SignInPage;