import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./game.css";
import { __COMPONENT_NAME__ } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="h-full">
      <__COMPONENT_NAME__ />
    </div>
  </StrictMode>
);
