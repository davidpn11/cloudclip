const repoUrl = "https://github.com/davidpn11/cloudclip";
// Relative links, so they work under any base path. `bun run sync` copies the review app and demo media into public/.
const videoDemo = "app/?src=../demo/sample.mp4";
const imageDemo = "app/?src=../demo/sample.jpg";

const install = ["/plugin marketplace add davidpn11/cloudclip", "/plugin install cloudclip@cloudclip"];

const schema = `[
  {"time": 72.4, "timestamp": "1:12.4",
   "text": "blur this logo",
   "box": {"x": 1190, "y": 86, "w": 384, "h": 108}},
  {"time": 95.2, "timestamp": "1:35.2",
   "text": "cut from here to 1:50"}
]`;

const steps = [
  {
    title: "Ask your agent",
    body: (
      <>
        Say "Review ~/Videos/launch.mp4 with CloudClip". The agent starts a local server and opens the review
        page.
      </>
    ),
  },
  {
    title: "Pause, mark, comment",
    body: (
      <>
        Press <kbd>C</kbd>, drag a box or click a spot on the frame, and type. Images work the same way, without
        timestamps.
      </>
    ),
  },
  {
    title: "Get a new file",
    body: "The agent grabs each marked frame to see what you pointed at, asks about anything unclear, and writes launch.cloudclip.mp4 next to the original.",
  },
];

function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fcbff" />
          <stop offset="1" stopColor="#2d8cff" />
        </linearGradient>
      </defs>
      <path d="M7 19a5 5 0 0 1-.7-9.95A6.5 6.5 0 0 1 18.6 10 4.5 4.5 0 0 1 18 19H7z" fill="url(#g)" />
      <g transform="translate(17.6 15.2) rotate(-150) scale(0.28) translate(-12.5 -12)" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
        <circle cx="6" cy="6" r="3" />
        <circle cx="6" cy="18" r="3" />
        <path d="M8.12 8.12 12 12M20 4 8.12 15.88M14.8 14.8 20 20" />
      </g>
    </svg>
  );
}

export default function Home() {
  return (
    <main className="page">
      <nav className="glass">
        <span className="brand">
          <Logo />
          CloudClip
        </span>
        <button className="theme-toggle" type="button" data-theme-toggle aria-label="Toggle dark mode">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" />
          </svg>
        </button>
        <a className="btn" href={repoUrl}>
          GitHub
        </a>
      </nav>

      <header className="hero">
        <h1>
          Comment on a video like a doc. <span>Your agent makes the edits.</span>
        </h1>
        <p className="lead">
          Pause the video, drag a box or click a spot, and type what should change. CloudClip saves each comment
          with its timestamp and pixel coordinates, and your AI agent applies them with ffmpeg.
        </p>
        <div className="ctas">
          <a className="btn primary" href={videoDemo}>
            Try the video demo
          </a>
          <a className="btn" href={imageDemo}>
            Try it on an image
          </a>
          <a className="btn" href="#install">
            Install
          </a>
        </div>
      </header>

      <section className="demo glass" aria-label="Live demo">
        <iframe src={videoDemo} title="CloudClip live demo" loading="lazy" />
      </section>

      <section className="grid">
        {steps.map((step, i) => (
          <div key={step.title} className="card glass">
            <span className="step">{i + 1}</span>
            <b>{step.title}</b>
            <p>{step.body}</p>
          </div>
        ))}
      </section>

      <section className="grid">
        <div className="card glass">
          <h2>What your agent receives</h2>
          <pre className="code">{schema}</pre>
          <p className="muted">
            Times are in seconds and coordinates are in source pixels, the numbers ffmpeg's crop, boxblur, drawbox
            and trim filters take.
          </p>
        </div>
        <div className="card glass" id="install">
          <h2>Install</h2>
          <p className="muted">In Claude Code, desktop app or terminal:</p>
          <pre className="code">{install.join("\n")}</pre>
          <p className="muted">
            It needs <code>python3</code> and <code>ffmpeg</code>. For Codex, Gemini CLI, Cursor or Grok, clone the
            repo so the agent reads <code>AGENTS.md</code>, or copy <code>skills/review</code> into the agent's
            skills folder.
          </p>
        </div>
      </section>

      <footer className="muted">
        The review server listens on 127.0.0.1 only, so your media stays on your machine. The demo on this page
        saves comments in your browser.
      </footer>
    </main>
  );
}
