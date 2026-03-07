import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ApexVisualizerTool from '@/components/ApexVisualizerTool';

export const metadata = {
  title: 'Free Apex Visualizer — See What Your Code Actually Does | Sanity Suite',
  description:
    'Paste any Salesforce Apex class and see its Business Process Map — the story of what your code does, not how it\'s written. Compare versions, catch anti-patterns. Free, no login, 100% client-side.',
  keywords: [
    'Apex Visualizer',
    'Salesforce Apex',
    'Apex Flowchart',
    'Apex Business Process Map',
    'Salesforce Developer Tool',
    'Free Salesforce Tool',
    'Apex Code Review',
    'Apex Anti-Pattern Detection',
  ],
  openGraph: {
    title: 'Free Apex Visualizer — See What Your Code Actually Does',
    description:
      'Paste any Apex class and see its Business Process Map. Compare versions, catch anti-patterns. Free, no login, 100% client-side.',
    url: 'https://sanity-suite.vercel.app/tools/apex-visualizer',
    siteName: 'Sanity Suite',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Apex Visualizer — Paste Apex, See the Flowchart',
    description:
      'Visualize any Apex class as an interactive flowchart. Free, no login, runs in your browser.',
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
