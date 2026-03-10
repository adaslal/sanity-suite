import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ApexVisualizerTool from '@/components/ApexVisualizerTool';

export const metadata = {
  title: 'Free Code Visualizer — See What Your Code Actually Does | Sanity Suite',
  description:
    'Paste any code (Apex, JavaScript, Java, C#) and see its Business Process Map — the story of what your code does, not how it\'s written. Compare versions, catch anti-patterns. Free, no login, 100% client-side.',
  keywords: [
    'Code Visualizer',
    'Apex Visualizer',
    'JavaScript Flowchart',
    'Java Flowchart',
    'C# Flowchart',
    'Code to Flowchart',
    'Business Process Map',
    'Salesforce Apex',
    'React Flowchart',
    'Free Developer Tool',
    'Code Review',
    'Anti-Pattern Detection',
  ],
  openGraph: {
    title: 'Free Code Visualizer — See What Your Code Actually Does',
    description:
      'Paste any code (Apex, JS, Java, C#) and see its Business Process Map. Compare versions, catch anti-patterns. Free, no login, 100% client-side.',
    url: 'https://sanity-suite.vercel.app/tools/apex-visualizer',
    siteName: 'Sanity Suite',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Code Visualizer — Paste Code, See the Flowchart',
    description:
      'Visualize any code as an interactive flowchart. Supports Apex, JavaScript, Java & C#. Free, no login, runs in your browser.',
  },
};

export default function ApexVisualizerPage() {
  return (
    <>
      <Header />
      <main>
        <ApexVisualizerTool />
      </main>
      <Footer />
    </>
  );
}
