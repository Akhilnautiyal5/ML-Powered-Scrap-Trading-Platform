import React from "react";
import LogoVerifier from "../components/ai_features/LogoVerifier";

const LogoVerifierPage = () => {
  return (
    <div className="section-tools min-h-screen px-4 py-16 transition-colors duration-300">
      <div className="mx-auto max-w-5xl">
        <LogoVerifier />
      </div>
    </div>
  );
};

export default LogoVerifierPage;

