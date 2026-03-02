/**
 * VideoDemo — Embeds a YouTube demo walkthrough.
 *
 * USAGE:
 *   1. Record your demo video
 *   2. Upload to YouTube
 *   3. Replace YOUTUBE_VIDEO_ID below with your video ID
 *      (the part after ?v= in the YouTube URL)
 *   4. Push to GitHub — Vercel auto-deploys
 */

// ⬇️  Replace this with your real YouTube video ID after uploading
const YOUTUBE_VIDEO_ID = '_IcahgYym4U';

export default function VideoDemo() {
  // Don't render anything until a video ID is set
  if (!YOUTUBE_VIDEO_ID) return null;

  return (
    <section id="video-demo" className="py-20 md:py-28 bg-surface">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">
            See It In Action
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            3-Minute Walkthrough
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted">
            Watch Sanity Suite analyze Flows, scan an entire org, patch Permission
            Sets, and generate logic hashes — all inside a live Salesforce org.
          </p>
        </div>

        {/* 16:9 responsive embed */}
        <div className="mt-12 overflow-hidden rounded-xl border border-border shadow-lg shadow-black/20">
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <iframe
              className="absolute inset-0 h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${YOUTUBE_VIDEO_ID}?rel=0&modestbranding=1`}
              title="Sanity Suite — Demo Walkthrough"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>

        {/* Subtle CTA below the video */}
        <div className="mt-8 text-center">
          <a
            href="https://abhilash38.gumroad.com/l/jdenr?wanted=true"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent-light hover:shadow-accent/40"
          >
            Get Sanity Suite — $29
          </a>
          <p className="mt-3 text-xs text-muted">
            Deploy to your org in under 5 minutes
          </p>
        </div>
      </div>
    </section>
  );
}
