import DefaultTheme from "vitepress/theme";
import Scalar from "./components/Scalar.vue";
import "./custom.css";
import type { Theme } from "vitepress";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("scalar", Scalar);
  },
} satisfies Theme;
