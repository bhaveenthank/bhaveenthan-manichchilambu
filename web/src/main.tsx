import "@fontsource/playfair-display/700.css";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/noto-sans-tamil/400.css";
import "@fontsource/noto-sans-tamil/500.css";
import "@fontsource/noto-sans-tamil/600.css";
import "@fontsource/noto-serif-tamil/700.css";
import { Component, type ReactNode, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

// One broken page shouldn't blank the whole site, so offer a way back.
class Recover extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  // Moving to another page is a fresh start, so a link out of here always works.
  componentDidMount() { window.addEventListener("hashchange", this.reset); }
  componentWillUnmount() { window.removeEventListener("hashchange", this.reset); }
  reset = () => { if (this.state.failed) this.setState({ failed: false }); };
  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="page"><h1>Something broke on this page.</h1><p style={{ margin: "16px 0" }}>The rest of the site is fine.</p><a className="pill" href="#/" onClick={() => { this.setState({ failed: false }); }}>Back to home</a></main>;
  }
}

createRoot(document.getElementById("root")!).render(<StrictMode><Recover><App /></Recover></StrictMode>);
