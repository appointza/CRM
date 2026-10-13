import { createStart } from "@tanstack/react-start";

/** Client-rendered SPA when hosted as static files from crmappointza wwwroot. */
export const startInstance = createStart(() => ({
  defaultSsr: false,
}));
