import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kräuterfee",
    short_name: "Kräuterfee",
    description: "Kräuterfee",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf9f4",
    theme_color: "#5a8f6e",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

