const repoUrl = "https://github.com/davidpn11/cloudclip";
// Relative links, so they work under any base path. `bun run sync` copies the review app and demo media into public/.
const videoDemo = "app/?src=../demo/sample.mp4";
const imageDemo = "app/?src=../demo/sample.jpg";

const agents = [
  {
    name: "Claude Code",
    commands: ["/plugin marketplace add davidpn11/cloudclip", "/plugin install cloudclip@cloudclip"],
    note: "In the desktop app or the terminal.",
  },
  {
    name: "Codex",
    commands: ["codex plugin marketplace add davidpn11/cloudclip", "codex plugin add cloudclip@cloudclip"],
    note: "In the Codex app, install it from Plugins. Start a new session afterwards.",
  },
  {
    name: "GitHub Copilot CLI",
    commands: ["copilot plugin marketplace add davidpn11/cloudclip", "copilot plugin install cloudclip@cloudclip"],
    note: "Copilot reads the same marketplace as Claude Code.",
  },
  {
    name: "Cursor",
    commands: ["git clone https://github.com/davidpn11/cloudclip ~/.cursor/plugins/local/cloudclip"],
    note: 'Then run "Developer: Reload Window". Cursor loads the Agent Plugins manifest as is.',
  },
  {
    name: "Grok Build",
    commands: ["git clone https://github.com/davidpn11/cloudclip ~/.grok/plugins/cloudclip"],
    note: "Grok also picks up CloudClip if you installed it in Claude Code.",
  },
  {
    name: "Antigravity and others",
    commands: ["npx skills add davidpn11/cloudclip"],
    note: "Copies the skill into each agent the skills CLI finds, such as Antigravity, OpenCode, Windsurf and Cline.",
  },
];

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
        {/* Cuts a gap in the cloud around the scissors, so they read on the cloud and off it. */}
        <mask id="cc-cut" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
          <rect width="24" height="24" fill="#fff" />
          <Scissors stroke="#000" width={7.8} />
        </mask>
      </defs>
      <path d="M7 19a5 5 0 0 1-.7-9.95A6.5 6.5 0 0 1 18.6 10 4.5 4.5 0 0 1 18 19H7z" fill="url(#g)" mask="url(#cc-cut)" />
      <Scissors stroke="#2d8cff" width={2.6} />
    </svg>
  );
}

function Scissors({ stroke, width }: { stroke: string; width: number }) {
  return (
    <g
      transform="translate(16.6 19) rotate(180) scale(0.3) translate(-12.5 -12)"
      fill="none"
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
    >
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M8.12 8.12 19 19M8.12 15.88 19 5" />
    </g>
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
      </section>

      <section className="install" id="install">
        <h2>Install it in your agent</h2>
        <p className="muted">
          Every agent needs <code>python3</code> and <code>ffmpeg</code> on your machine.{" "}
          <a href={`${repoUrl}#install`}>Full install guide</a>
        </p>
        <div className="grid">
          {agents.map((agent) => (
            <div key={agent.name} className="card glass">
              <b>{agent.name}</b>
              <pre className="code">{agent.commands.join("\n")}</pre>
              <p className="muted">{agent.note}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="muted">
        The review server listens on 127.0.0.1 only, so your media stays on your machine. The demo on this page
        saves comments in your browser.
      </footer>
    </main>
  );
}
