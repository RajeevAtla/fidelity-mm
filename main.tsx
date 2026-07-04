import "./tailwind.generated.css";
import { render } from "preact";
import App, { applyThemeToDocument, getStoredThemeMode, resolveThemeMode } from "./index";

const initialThemeMode = getStoredThemeMode();
applyThemeToDocument(resolveThemeMode(initialThemeMode));

render(<App initialThemeMode={initialThemeMode} />, document.getElementById("root")!);
