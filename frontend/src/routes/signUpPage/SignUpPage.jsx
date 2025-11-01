// src/routes/signUpPage/SignUpPage.jsx (Final Animated Version)

import { SignUp } from "@clerk/clerk-react";
import "./signUpPage.css";
import React, { useContext, useState } from "react"; // ⬅️ Added React, useState
import { ThemeContext } from "../../context/ThemeContext";
import { dark } from "@clerk/themes";

const SignUpPage = () => {
  const { theme } = useContext(ThemeContext);
  const hasClerk = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

  // ⬅️ NEW: State to track mouse position for the interactive background effect
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });

  // ⬅️ NEW: Handler to update the mouse position state
  const handleMouseMove = (e) => {
    // Calculate position as a percentage (0 to 100)
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePosition({ x, y });
  };

  if (!hasClerk) {
    return <div className="signUpPage">Authentication is not configured.</div>;
  }

  return (
    // ⬅️ NEW: 'interactive-bg', onMouseMove handler, and dynamic CSS variables
    <div
      className="signUpPage interactive-bg"
      onMouseMove={handleMouseMove}
      style={{
        '--mouse-x': `${mousePosition.x}%`,
        '--mouse-y': `${mousePosition.y}%`,
      }}
    >
      {/* ⬅️ NEW: Re-introducing the decorative orbital element for visual consistency */}
      <img src="/orbital.png" alt="Orbital background" className="orbital-bg-sign-up" />

      <SignUp
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
        afterSignUpUrl="/dashboard"
        appearance={{
          baseTheme: theme === 'dark' ? dark : undefined,
          // ⬅️ NEW: Ensure the Clerk card has a solid background and high z-index
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

export default SignUpPage;