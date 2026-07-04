import { render } from "preact";
import App from "./index";
import { applyThemeToDocument, getStoredThemeMode, resolveThemeMode } from "./theme";

const initialThemeMode = getStoredThemeMode();
applyThemeToDocument(resolveThemeMode(initialThemeMode));

render(<App initialThemeMode={initialThemeMode} />, document.getElementById("root")!);
