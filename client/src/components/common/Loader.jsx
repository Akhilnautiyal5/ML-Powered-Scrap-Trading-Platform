import React from "react";

const Loader = ({ text = "Loading..." }) => {
  return (
    <div className="flex flex-col items-center justify-center p-6 gap-3">
      
      {/* Spinner */}
      <div
        className="relative h-12 w-12"
        role="status"
        aria-label="Loading"
      >
        <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-white/20"></div>
        <div className="absolute inset-0 rounded-full border-4 border-t-gray-500 dark:border-t-white animate-spin"></div>
      </div>

      {/* Text */}
      <p className="text-sm text-gray-600 dark:text-white/70 tracking-wide animate-pulse">
        {text}
      </p>
    </div>
  );
};

export default Loader;
