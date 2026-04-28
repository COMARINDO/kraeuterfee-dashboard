import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #064e3b 0%, #0a0a0a 60%)",
          color: "white",
          fontSize: 120,
          letterSpacing: -4,
          fontWeight: 800,
        }}
      >
        KF
      </div>
    ),
    size,
  );
}

