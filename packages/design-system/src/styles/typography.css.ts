import { createGlobalTheme } from "@vanilla-extract/css";

export const typography = createGlobalTheme(":root", {
  fontSize: {
    d1: "84px",
    d2: "77px",
    d3: "63px",
    d4: "49px",
    h1: "28px",
    h2: "24px",
    h3: "21px",
    h4: "18px",
    h5: "15px",
    h6: "14px",
    h7: "13px",
  },

  // Font Families
  fontFamily: {
    pretendard: "Pretendard",
    malgunGothic: "Malgun Gothic",
  },
});
