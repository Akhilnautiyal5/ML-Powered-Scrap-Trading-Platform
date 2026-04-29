import React from "react";
import PriceSuggestion from "../components/ai_features/PriceSuggestion";

const PricePredictor = () => {
  return (
    <div className="section-pricing min-h-screen py-12 px-4 transition-colors duration-300">
      <div className="mx-auto max-w-6xl">
        <PriceSuggestion />
      </div>
    </div>
  );
};

export default PricePredictor;